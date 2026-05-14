"use client";

import { motion } from "motion/react";
import type { CanvasState } from "@/lib/useCanvas";
import { pillColorForParticipant } from "@/lib/palette";

export default function ParticipantSynthesize({
  state,
  participantId,
}: {
  state: CanvasState;
  participantId: string;
}) {
  if (!state.canvas) return null;
  const synthesis = state.canvas.synthesis_result;
  const participantsById = new Map(state.participants.map((p) => [p.id, p]));

  return (
    <main className="flex-1 flex flex-col p-4 bg-grey-100">
      <div className="max-w-md mx-auto w-full">
        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">✨ Synthesis</p>
        <h1 className="text-[20px] font-medium leading-snug text-foreground mb-4">
          Here&apos;s how the room thinks about the lifecycle
        </h1>

        {synthesis ? (
          <>
            <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">🤖 Proposed</p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {synthesis.stages.map((s, i) => {
                const dots = { high: 5, medium: 3, low: 1 }[s.confidence];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-[6px] border-2 px-2 py-1.5"
                    style={{
                      backgroundColor: s.confidence === "low" ? "#FFFDE6" : "#FFFFFF",
                      borderColor: s.confidence === "low" ? "#FFF599" : "#DAD9D6",
                    }}
                  >
                    <p className="text-[12px] font-semibold text-foreground">{s.label}</p>
                    <div className="mt-0.5 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span
                          key={j}
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            j < dots ? "bg-deep-blue-800" : "bg-grey-300"
                          }`}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="rounded-[8px] bg-white border border-border p-3 mb-5">
              <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-1.5">📝 Narrative</p>
              <p className="text-[13px] leading-relaxed text-foreground">{synthesis.narrative}</p>
            </div>
          </>
        ) : null}

        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">👥 Everyone&apos;s lists</p>
        <div className="space-y-2 mb-6">
          {state.submissions.map((s) => {
            const p = participantsById.get(s.participant_id);
            const pill = p ? pillColorForParticipant(p.id) : null;
            const mine = s.participant_id === participantId;
            return (
              <div
                key={s.id}
                className={`rounded-[8px] border p-2 ${
                  mine ? "border-foreground bg-white" : "border-border bg-white"
                }`}
              >
                {pill ? (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium mb-1.5"
                    style={{ backgroundColor: pill.bg, color: pill.fg }}
                  >
                    {p?.name}{mine ? " · you" : ""}
                  </span>
                ) : null}
                <div className="flex flex-wrap items-center gap-1 text-[12px]">
                  {s.stages.map((st, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="rounded-[3px] bg-grey-100 border border-grey-200 px-1.5 py-0.5 text-foreground">
                        {st}
                      </span>
                      {i < s.stages.length - 1 ? <span className="text-grey-500">→</span> : null}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-grey-600 text-center">
          ⏳ The facilitator is reviewing — the canvas will open shortly.
        </p>
      </div>
    </main>
  );
}
