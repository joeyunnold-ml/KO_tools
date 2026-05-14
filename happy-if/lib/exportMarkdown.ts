import type { SessionState } from "./useSession";

export function buildMarkdown(state: SessionState): string {
  if (!state.session) return "";
  const participants = state.participants;
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const groups = [...state.groups].sort((a, b) => a.sort_order - b.sort_order);

  const voteCounts = new Map<string, { total: number; ml: number; avis: number }>();
  groups.forEach((g) => voteCounts.set(g.id, { total: 0, ml: 0, avis: 0 }));
  for (const v of state.votes) {
    const tally = voteCounts.get(v.group_id);
    if (!tally) continue;
    tally.total += 1;
    const team = participantsById.get(v.participant_id)?.team;
    if (team === "monstarlab") tally.ml += 1;
    if (team === "avis") tally.avis += 1;
  }

  const ranked = [...groups].sort((a, b) => (voteCounts.get(b.id)!.total - voteCounts.get(a.id)!.total));

  const dateStr = new Date(state.session.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const lines: string[] = [];
  lines.push(`# We'll be happy if… — ${dateStr}`);
  lines.push("");
  lines.push(`- Room code: \`${state.session.room_code}\``);
  lines.push(`- Participants: ${participants.length}`);
  lines.push(`- Names: ${participants.map((p) => `${p.name} (${p.team === "monstarlab" ? "ML" : "Avis"})`).join(", ")}`);
  lines.push("");

  lines.push("## Priority ranking");
  lines.push("");
  ranked.forEach((g, i) => {
    const tally = voteCounts.get(g.id)!;
    lines.push(`${i + 1}. **${g.label}** — ${tally.total} votes (ML: ${tally.ml}, Avis: ${tally.avis})`);
  });
  lines.push("");

  lines.push("## Responses by cluster");
  lines.push("");
  for (const g of ranked) {
    const tally = voteCounts.get(g.id)!;
    lines.push(`### ${g.label} (${tally.total} votes)`);
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

  const unclustered = state.responses.filter((r) => r.group_id === null);
  if (unclustered.length > 0) {
    lines.push("## Unclustered");
    lines.push("");
    for (const r of unclustered) {
      const author = participantsById.get(r.participant_id);
      lines.push(`- "${r.text}" — ${author?.name ?? "—"}`);
    }
    lines.push("");
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
