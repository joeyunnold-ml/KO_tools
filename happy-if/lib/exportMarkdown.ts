import type { SessionState } from "./useSession";

export function buildMarkdown(state: SessionState): string {
  if (!state.session) return "";
  const participants = state.participants;
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const questions = [...state.questions].sort((a, b) => a.sort_order - b.sort_order);
  const dateStr = new Date(state.session.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const lines: string[] = [];
  lines.push(`# We'll be happy if… — ${dateStr}`);
  lines.push("");
  lines.push(`- Room code: \`${state.session.room_code}\``);
  lines.push(`- Participants: ${participants.length}`);
  lines.push(`- Names: ${participants.map((p) => p.name).join(", ")}`);
  lines.push("");

  if (questions.length === 0) {
    lines.push("_No prompts defined for this session._");
    return lines.join("\n");
  }

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const groups = state.groups
      .filter((g) => g.question_id === q.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const voteCounts = new Map<string, number>();
    groups.forEach((g) => voteCounts.set(g.id, 0));
    for (const v of state.votes) {
      if (voteCounts.has(v.group_id)) {
        voteCounts.set(v.group_id, (voteCounts.get(v.group_id) ?? 0) + 1);
      }
    }
    const ranked = [...groups].sort(
      (a, b) => (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0),
    );

    lines.push(`## Prompt ${qi + 1}: ${q.text}`);
    lines.push("");

    lines.push("### Priority ranking");
    lines.push("");
    if (ranked.length === 0) {
      lines.push("_(no groups)_");
    } else {
      ranked.forEach((g, i) => {
        const total = voteCounts.get(g.id) ?? 0;
        lines.push(`${i + 1}. **${g.label}** — ${total} votes`);
      });
    }
    lines.push("");

    lines.push("### Responses by cluster");
    lines.push("");
    for (const g of ranked) {
      const total = voteCounts.get(g.id) ?? 0;
      lines.push(`#### ${g.label} (${total} votes)`);
      lines.push("");
      const items = state.responses.filter((r) => r.group_id === g.id);
      if (items.length === 0) {
        lines.push("_(no responses)_");
      } else {
        for (const r of items) {
          const author = participantsById.get(r.participant_id);
          lines.push(`- "${r.text}" — ${author?.name ?? "—"}`);
        }
      }
      lines.push("");
    }

    const unclustered = state.responses.filter(
      (r) => r.question_id === q.id && r.group_id === null,
    );
    if (unclustered.length > 0) {
      lines.push("### Unclustered");
      lines.push("");
      for (const r of unclustered) {
        const author = participantsById.get(r.participant_id);
        lines.push(`- "${r.text}" — ${author?.name ?? "—"}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function downloadMarkdown(state: SessionState) {
  const md = buildMarkdown(state);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `happy-if-${state.session?.room_code ?? "session"}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
