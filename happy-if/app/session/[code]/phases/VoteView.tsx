"use client";

import { useMemo } from "react";
import type { SessionState } from "@/lib/useSession";

export default function VoteView({
  state,
  onAdvance,
  advancing,
  buttonLabel,
}: {
  state: SessionState;
  onAdvance: () => void;
  advancing: boolean;
  buttonLabel: string;
}) {
  const groups = [...state.groups].sort((a, b) => a.sort_order - b.sort_order);
  const participantsById = useMemo(() => {
    const m = new Map<string, { team: "monstarlab" | "avis" }>();
    state.participants.forEach((p) => m.set(p.id, { team: p.team }));
    return m;
  }, [state.participants]);

  const votedCount = new Set(state.votes.map((v) => v.participant_id)).size;

  return (
    <div className="flex-1 flex flex-col p-12 bg-white">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[28px] font-medium text-foreground">🗳️ Voting in progress</h1>
        <div className="text-[18px] text-grey-800">
          🧮 <span className="font-medium text-foreground">{votedCount}</span> of {state.participants.length} have voted
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min overflow-y-auto">
        {groups.map((g) => {
          const groupVotes = state.votes.filter((v) => v.group_id === g.id);
          const ml = groupVotes.filter((v) => participantsById.get(v.participant_id)?.team === "monstarlab").length;
          const avis = groupVotes.filter((v) => participantsById.get(v.participant_id)?.team === "avis").length;
          return (
            <div key={g.id} className="rounded-[8px] bg-white border border-border p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[18px] font-semibold text-foreground">{g.label}</h3>
                <span className="text-[28px] font-bold tabular-nums text-foreground">{groupVotes.length}</span>
              </div>
              <VoteDots count={groupVotes.length} />
              <div className="mt-3 flex gap-4 text-xs text-grey-800">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--team-monstarlab)" }} />
                  ML: <span className="font-medium text-foreground">{ml}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--team-avis)" }} />
                  Avis: <span className="font-medium text-foreground">{avis}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          onClick={onAdvance}
          disabled={advancing}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40"
        >
          {advancing ? "Closing…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}

export function VoteDots({ count }: { count: number }) {
  const shown = Math.min(count, 30);
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className="inline-block w-3 h-3 rounded-full bg-deep-blue-800" />
      ))}
      {count > shown ? <span className="text-xs text-grey-700 ml-1">+{count - shown}</span> : null}
    </div>
  );
}
