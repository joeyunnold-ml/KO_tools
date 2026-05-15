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
  const questions = useMemo(
    () => [...state.questions].sort((a, b) => a.sort_order - b.sort_order),
    [state.questions],
  );

  return (
    <main className="flex-1 p-4 bg-grey-100">
      <div className="max-w-md mx-auto">
        <h1 className="text-[22px] font-medium mb-1 text-foreground">🏆 Priorities</h1>
        <p className="text-sm text-grey-700 mb-6">📊 Ranked by votes.</p>

        {questions.map((q, qIdx) => {
          const ranked = state.groups
            .filter((g) => g.question_id === q.id)
            .map((g) => ({
              group: g,
              total: state.votes.filter((v) => v.group_id === g.id).length,
              originalIndex: g.sort_order,
            }))
            .sort((a, b) => b.total - a.total);
          return (
            <section key={q.id} className="mb-8">
              {questions.length > 1 ? (
                <div className="mb-3 pb-2 border-b border-border">
                  <p className="text-[11px] font-medium uppercase tracking-[2px] text-grey-700">
                    Prompt {qIdx + 1}
                  </p>
                  <p className="text-[14px] font-medium text-foreground leading-snug">{q.text}</p>
                </div>
              ) : null}
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
                {ranked.length === 0 ? (
                  <p className="text-sm text-grey-600 italic">No groups for this prompt.</p>
                ) : null}
              </ol>
            </section>
          );
        })}
      </div>
    </main>
  );
}
