import type { LaneState } from "./useLanes";
import type { Lane } from "./types";

export function buildMarkdown(state: LaneState): string {
  if (!state.session) return "";
  const items = state.items;
  const participants = state.participants.filter((p) => !p.is_facilitator);
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const dateStr = new Date(state.session.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const lines: string[] = [];
  lines.push(`# Three-Lane Framework — ${dateStr}`);
  lines.push("");
  lines.push(`- Room code: \`${state.session.room_code}\``);
  lines.push(`- Participants: ${participants.length} (${participants.map((p) => `${p.name} (${p.team === "monstarlab" ? "ML" : "Avis"})`).join(", ")})`);
  lines.push(`- Capture phase: ${state.session.capture_enabled ? "enabled" : "disabled"}`);
  lines.push(`- Blind sort: ${state.session.blind_sort_enabled ? "enabled" : "disabled"}`);
  lines.push("");

  // Final classification by lane
  lines.push("## Final classification");
  lines.push("");
  const lanes: Lane[] = ["fix", "test", "build"];
  const laneLabels: Record<Lane, string> = { fix: "🔧 Fix It", test: "🧪 Test It", build: "🏗️ Build It" };
  for (const lane of lanes) {
    const inLane = items.filter((i) => i.final_lane === lane);
    lines.push(`### ${laneLabels[lane]}`);
    if (inLane.length === 0) {
      lines.push("_(none)_");
    } else {
      for (const item of inLane) {
        lines.push(`- **${item.title}**${item.description ? ` — ${item.description}` : ""}${item.source ? ` _(source: ${item.source})_` : ""}`);
      }
    }
    lines.push("");
  }
  const unresolved = items.filter((i) => !i.final_lane);
  if (unresolved.length > 0) {
    lines.push("### Unresolved");
    for (const item of unresolved) {
      lines.push(`- **${item.title}**${item.description ? ` — ${item.description}` : ""}`);
    }
    lines.push("");
  }

  // Vote distributions (if blind sort was used)
  if (state.session.blind_sort_enabled && state.classifications.length > 0) {
    lines.push("## Vote distribution");
    lines.push("");
    for (const item of items) {
      const cls = state.classifications.filter((c) => c.item_id === item.id);
      if (cls.length === 0) continue;
      const dist = { fix: 0, test: 0, build: 0 };
      const teamSplit: Record<Lane, { ml: number; avis: number }> = {
        fix: { ml: 0, avis: 0 },
        test: { ml: 0, avis: 0 },
        build: { ml: 0, avis: 0 },
      };
      for (const c of cls) {
        dist[c.lane] += 1;
        const p = participantsById.get(c.participant_id);
        if (p?.team === "monstarlab") teamSplit[c.lane].ml += 1;
        if (p?.team === "avis") teamSplit[c.lane].avis += 1;
      }
      lines.push(`- **${item.title}** — Fix: ${dist.fix} (ML ${teamSplit.fix.ml}, Avis ${teamSplit.fix.avis}) · Test: ${dist.test} (ML ${teamSplit.test.ml}, Avis ${teamSplit.test.avis}) · Build: ${dist.build} (ML ${teamSplit.build.ml}, Avis ${teamSplit.build.avis})`);
    }
    lines.push("");
  }

  // AI analysis
  const analysis = state.session.analysis_result;
  if (analysis) {
    if (analysis.patterns && analysis.patterns.length > 0) {
      lines.push("## Pattern observations");
      lines.push("");
      for (const p of analysis.patterns) {
        lines.push(`- ${p.observation}`);
      }
      lines.push("");
    }
    if (analysis.contested && analysis.contested.length > 0) {
      lines.push("## Contested items — discussion prompts");
      lines.push("");
      for (const c of analysis.contested) {
        const item = itemsById.get(c.item_id);
        if (!item) continue;
        const placement = item.final_lane ? ` → placed in **${laneLabels[item.final_lane]}**` : " → unresolved";
        lines.push(`- **${item.title}**${placement}`);
        lines.push(`  > ${c.discussion_prompt}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function downloadMarkdown(state: LaneState) {
  const md = buildMarkdown(state);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `three-lanes-${state.session?.room_code ?? "session"}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
