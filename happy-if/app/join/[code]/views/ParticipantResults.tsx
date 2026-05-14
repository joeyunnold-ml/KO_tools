"use client";

import { useMemo } from "react";
import type { SessionState } from "@/lib/useSession";

export default function ParticipantResults({
  state,
  participantId,
}: {
  state: SessionState;
  participantId: string;
}) {
  void participantId;
  const participantsById = useMemo(() => {
    const m = new Map<string, { team: "monstarlab" | "avis" }>();
    state.participants.forEach((p) => m.set(p.id, { team: p.team }));
    return m;
  }, [state.participants]);

  const ranked = useMemo(() => {
    return state.groups
      .map((g) => {
        const votes = state.votes.filter((v) => v.group_id === g.id);
        const ml = votes.filter((v) => participantsById.get(v.participant_id)?.team === "monstarlab").length;
        const avis = votes.filter((v) => participantsById.get(v.participant_id)?.team === "avis").length;
        return { group: g, total: votes.length, ml, avis };
      })
      .sort((a, b) => b.total - a.total);
  }, [state.groups, state.votes, participantsById]);

  return (
    <main className="flex-1 p-4 bg-grey-100">
      <div className="max-w-md mx-auto">
        <h1 className="text-[22px] font-medium mb-1 text-foreground">🏆 Priorities</h1>
        <p className="text-sm text-grey-700 mb-6">📊 Ranked by votes.</p>
        <ol className="space-y-3">
          {ranked.map((r, i) => (
            <li key={r.group.id} className="rounded-[8px] bg-white border border-border p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-[22px] font-bold tabular-nums text-grey-500">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <h3 className="font-semibold flex-1 text-foreground">{r.group.label}</h3>
                <span className="text-[22px] font-bold tabular-nums text-foreground">{r.total}</span>
              </div>
              <div className="mt-2 ml-9 flex gap-3 text-xs text-grey-800">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--team-monstarlab)" }} /> ML: <span className="font-medium text-foreground">{r.ml}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--team-avis)" }} /> Avis: <span className="font-medium text-foreground">{r.avis}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
