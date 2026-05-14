import type { CanvasState } from "./useCanvas";

export function buildMarkdown(state: CanvasState): string {
  if (!state.canvas) return "";
  const participants = state.participants;
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const columns = [...state.columns].sort((a, b) => a.sort_order - b.sort_order);
  const rows = [...state.rows].sort((a, b) => a.sort_order - b.sort_order);

  const lines: string[] = [];
  const dateStr = new Date(state.canvas.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  lines.push(`# Experiment Lifecycle Canvas — ${dateStr}`);
  lines.push("");
  lines.push(`- Room code: \`${state.canvas.room_code}\``);
  lines.push(`- Participants: ${participants.length} (${participants.map((p) => p.name).join(", ")})`);
  lines.push("");

  // Individual lifecycle submissions (Beat 1)
  if (state.submissions.length > 0) {
    lines.push("## Individual lifecycle submissions");
    lines.push("");
    for (const sub of state.submissions) {
      const name = participantsById.get(sub.participant_id)?.name ?? "anon";
      lines.push(`- **${name}**: ${sub.stages.join(" → ")}`);
    }
    lines.push("");
  }

  // Synthesis (Beat 2)
  const synth = state.canvas.synthesis_result;
  if (synth) {
    lines.push("## AI synthesis");
    lines.push("");
    lines.push(`> ${synth.narrative}`);
    lines.push("");
    if (synth.divergences && synth.divergences.length > 0) {
      lines.push("### Divergences");
      lines.push("");
      for (const d of synth.divergences) {
        lines.push(`- ${d.description}`);
      }
      lines.push("");
    }
    lines.push("### Proposed stages");
    lines.push("");
    for (const s of synth.stages) {
      lines.push(`- **${s.label}** (${s.confidence}, ${s.source_count} mention${s.source_count === 1 ? "" : "s"})`);
    }
    lines.push("");
  }

  // Canvas content by column
  lines.push("## Canvas");
  lines.push("");
  for (const col of columns) {
    lines.push(`### ${col.label}`);
    lines.push("");
    for (const row of rows) {
      const cellStickies = state.stickies.filter(
        (s) => s.column_id === col.id && s.row_id === row.id,
      );
      lines.push(`#### ${row.label}`);
      if (cellStickies.length === 0) {
        lines.push("_No contributions_");
      } else {
        for (const s of cellStickies) {
          const author = participantsById.get(s.participant_id)?.name ?? "anon";
          const star = s.highlighted ? " ⭐" : "";
          lines.push(`- ${s.text} — *${author}*${star}`);
        }
      }
      lines.push("");
    }
  }

  // Gap summary — empty cells
  lines.push("## Gap summary");
  lines.push("");
  let gaps = 0;
  for (const col of columns) {
    for (const row of rows) {
      const has = state.stickies.some((s) => s.column_id === col.id && s.row_id === row.id);
      if (!has) {
        lines.push(`- **${col.label}** × **${row.label}** — No contributions`);
        gaps += 1;
      }
    }
  }
  if (gaps === 0) lines.push("_Every cell has at least one contribution._");
  lines.push("");

  return lines.join("\n");
}

export function downloadMarkdown(state: CanvasState) {
  const md = buildMarkdown(state);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exp-canvas-${state.canvas?.room_code ?? "session"}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
