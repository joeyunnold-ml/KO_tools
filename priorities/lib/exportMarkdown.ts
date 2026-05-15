import type { VoteState } from "./useVotes";
import { buildRanking } from "./ranking";

export function buildMarkdown(state: VoteState): string {
  if (!state.session) return "";
  const dateStr = new Date(state.session.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const ranked = buildRanking(state);
  const participants = state.participants.filter((p) => !p.is_facilitator);
  const mlNames = participants.filter((p) => p.team === "monstarlab").map((p) => p.name).join(", ");
  const avisNames = participants.filter((p) => p.team === "avis").map((p) => p.name).join(", ");

  const lines: string[] = [];
  lines.push(`# Avis × Monstarlab — Week 1-2 Priorities`);
  lines.push("");
  lines.push(`## Workshop: ${dateStr}`);
  lines.push("");

  for (const r of ranked) {
    lines.push(`### Priority ${r.rank}: ${r.priority.title} (${r.total} votes)`);
    if (r.priority.description) {
      lines.push("");
      lines.push(`> ${r.priority.description}`);
    }
    lines.push("");
    lines.push(`- **ML Owner:** ${r.priority.ml_owner ?? "_TBD_"}`);
    lines.push(`- **Avis Counterpart:** ${r.priority.avis_counterpart ?? "_TBD_"}`);
    lines.push(`- **Access Needed:** ${r.priority.access_needed ?? "_TBD_"}`);
    lines.push(`- **First Action:** ${r.priority.first_action ?? "_TBD_"}`);
    lines.push("");
  }

  lines.push("## Vote Breakdown");
  lines.push("");
  lines.push("| Priority | Total | ML | Avis |");
  lines.push("|---|---|---|---|");
  for (const r of ranked) {
    lines.push(`| ${r.priority.title} | ${r.total} | ${r.ml} | ${r.avis} |`);
  }
  lines.push("");

  lines.push("## Participants");
  lines.push("");
  if (mlNames) lines.push(`**Monstarlab:** ${mlNames}`);
  if (avisNames) lines.push(`**Avis:** ${avisNames}`);
  lines.push("");

  lines.push(`---`);
  lines.push(`Room code: \`${state.session.room_code}\` · Votes per person: ${state.session.votes_per_person}`);

  return lines.join("\n");
}

export function downloadMarkdown(state: VoteState) {
  const md = buildMarkdown(state);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `priorities-${state.session?.room_code ?? "session"}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
