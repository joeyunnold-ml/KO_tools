"use client";

import { useMemo } from "react";
import type { SessionState } from "@/lib/useSession";
import { downloadMarkdown } from "@/lib/exportMarkdown";
import { VoteDots } from "./VoteView";

export default function ResultsView({ state }: { state: SessionState }) {
  const groups = state.groups;
  const participantsById = useMemo(() => {
    const m = new Map<string, { team: "monstarlab" | "avis" }>();
    state.participants.forEach((p) => m.set(p.id, { team: p.team }));
    return m;
  }, [state.participants]);

  const ranked = useMemo(() => {
    return groups
      .map((g) => {
        const votes = state.votes.filter((v) => v.group_id === g.id);
        const ml = votes.filter((v) => participantsById.get(v.participant_id)?.team === "monstarlab").length;
        const avis = votes.filter((v) => participantsById.get(v.participant_id)?.team === "avis").length;
        return { group: g, total: votes.length, ml, avis };
      })
      .sort((a, b) => b.total - a.total);
  }, [groups, state.votes, participantsById]);

  return (
    <div className="flex-1 flex flex-col p-12 bg-white">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[28px] font-medium text-foreground">🏆 Priorities <span className="text-grey-600 text-base font-normal">(ranked by votes)</span></h1>
        <button
          onClick={() => downloadMarkdown(state)}
          className="h-[44px] rounded-[4px] bg-yellow-500 text-foreground px-6 text-sm font-medium hover:bg-yellow-600"
        >
          📥 Export results
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {ranked.map((r, i) => (
          <div key={r.group.id} className="rounded-[8px] bg-white border border-border p-6">
            <div className="flex items-baseline gap-4 mb-3">
              <span className="text-[28px] font-bold tabular-nums text-grey-500 w-14">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
              </span>
              <h2 className="text-[22px] font-medium flex-1 text-foreground">{r.group.label}</h2>
              <span className="text-[28px] font-bold tabular-nums text-foreground">{r.total}</span>
            </div>
            <div className="pl-14">
              <VoteDots count={r.total} />
              <div className="mt-2 flex gap-4 text-xs text-grey-800">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--team-monstarlab)" }} />
                  ML: <span className="font-medium text-foreground">{r.ml}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--team-avis)" }} />
                  Avis: <span className="font-medium text-foreground">{r.avis}</span>
                </span>
              </div>
              <details className="mt-3">
                <summary className="text-xs text-grey-700 cursor-pointer hover:text-foreground">📄 View {state.responses.filter((rsp) => rsp.group_id === r.group.id).length} responses</summary>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {state.responses.filter((rsp) => rsp.group_id === r.group.id).map((rsp) => {
                    const author = state.participants.find((p) => p.id === rsp.participant_id);
                    return (
                      <li key={rsp.id}>&ldquo;{rsp.text}&rdquo; — <span className="text-grey-700">{author?.name ?? "—"}</span></li>
                    );
                  })}
                </ul>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
