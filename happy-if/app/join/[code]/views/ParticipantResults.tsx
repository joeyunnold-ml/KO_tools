"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import { paletteFor } from "@/lib/palette";

export default function ParticipantResults({
  state,
  participantId,
}: {
  state: SessionState;
  participantId: string;
}) {
  void participantId;
  const ranked = useMemo(() => {
    return [...state.groups]
      .map((g) => {
        const total = state.votes.filter((v) => v.group_id === g.id).length;
        return { group: g, total, originalIndex: g.sort_order };
      })
      .sort((a, b) => b.total - a.total);
  }, [state.groups, state.votes]);

  return (
    <main className="flex-1 p-4 bg-grey-100">
      <div className="max-w-md mx-auto">
        <h1 className="text-[22px] font-medium mb-1 text-foreground">🏆 Priorities</h1>
        <p className="text-sm text-grey-700 mb-6">📊 Ranked by votes.</p>
        <ol className="space-y-3">
          {ranked.map((r, i) => {
            const palette = paletteFor(r.originalIndex);
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            return (
              <motion.li
                key={r.group.id}
                layout
                className="rounded-[8px] border-2 p-4"
                style={{ backgroundColor: palette.bg, borderColor: palette.border }}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[22px] font-bold tabular-nums" style={{ color: palette.text }}>
                    {medal}
                  </span>
                  <h3 className="font-semibold flex-1" style={{ color: palette.text }}>
                    {r.group.label}
                  </h3>
                  <span className="text-[22px] font-bold tabular-nums" style={{ color: palette.text }}>
                    {r.total}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
