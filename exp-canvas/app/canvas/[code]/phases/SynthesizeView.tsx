"use client";

import { AnimatePresence, motion } from "motion/react";
import type { CanvasState } from "@/lib/useCanvas";
import { pillColorForParticipant } from "@/lib/palette";

export default function SynthesizeView({
  state,
  onAccept,
  onStartFromScratch,
  busy,
}: {
  state: CanvasState;
  onAccept: () => void;
  onStartFromScratch: () => void;
  busy: boolean;
}) {
  if (!state.canvas) return null;
  const synthesis = state.canvas.synthesis_result;
  const participantsById = new Map(state.participants.map((p) => [p.id, p]));

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 bg-white">
      <div className="mb-6">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
          ✨ Synthesis
        </p>
        <h1 className="text-[28px] font-medium text-foreground">
          Here&apos;s how the room thinks about the lifecycle
        </h1>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0 overflow-hidden">
        {/* LEFT: individual submissions */}
        <div className="flex flex-col min-h-0">
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
            👥 Individual submissions
          </p>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <AnimatePresence>
              {state.submissions.map((sub, i) => {
                const p = participantsById.get(sub.participant_id);
                const pill = p ? pillColorForParticipant(p.id) : null;
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-[8px] bg-white border border-border p-3"
                  >
                    {pill ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium mb-2"
                        style={{ backgroundColor: pill.bg, color: pill.fg }}
                      >
                        {p?.name}
                      </span>
                    ) : null}
                    <StageChain stages={sub.stages} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT: AI proposal */}
        <div className="flex flex-col min-h-0">
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
            🤖 Synthesized lifecycle
          </p>
          {synthesis ? (
            <div className="flex-1 overflow-y-auto pr-2 space-y-5">
              {/* Proposed stages as a chain */}
              <div className="flex flex-wrap gap-2">
                {synthesis.stages.map((s, i) => (
                  <ProposedStage key={i} stage={s} />
                ))}
              </div>

              {/* Narrative */}
              <div className="rounded-[8px] bg-grey-100 border border-border p-4">
                <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
                  📝 Narrative
                </p>
                <p className="text-[15px] leading-relaxed text-foreground">{synthesis.narrative}</p>
              </div>

              {/* Divergences */}
              {synthesis.divergences && synthesis.divergences.length > 0 ? (
                <div className="rounded-[8px] bg-white border border-border p-4">
                  <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
                    ⚠️ Divergences
                  </p>
                  <ul className="space-y-1 text-[14px] text-grey-800 list-disc list-inside">
                    {synthesis.divergences.map((d, i) => (
                      <li key={i}>{d.description}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-grey-700">
              No synthesis result available.
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex justify-end items-center gap-3">
        <button
          onClick={onStartFromScratch}
          disabled={busy}
          className="h-[44px] rounded-[4px] bg-white border border-grey-500 text-grey-800 px-5 text-sm font-medium hover:bg-grey-100 disabled:opacity-40"
        >
          🪨 Start from scratch
        </button>
        <button
          onClick={onAccept}
          disabled={busy || !synthesis}
          className="h-[44px] rounded-[4px] bg-yellow-500 text-foreground px-6 text-sm font-medium hover:bg-yellow-600 disabled:opacity-40"
        >
          ✏️ Use this & edit
        </button>
        <button
          onClick={onAccept}
          disabled={busy || !synthesis}
          className="h-[44px] rounded-[4px] bg-deep-blue-800 text-white px-6 text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-40"
        >
          ✅ Use this structure →
        </button>
      </div>
    </div>
  );
}

function StageChain({ stages }: { stages: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
      {stages.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="inline-block px-2 py-1 rounded-[4px] bg-grey-100 border border-grey-200 text-foreground">
            {s}
          </span>
          {i < stages.length - 1 ? <span className="text-grey-500">→</span> : null}
        </span>
      ))}
    </div>
  );
}

function ProposedStage({
  stage,
}: {
  stage: { label: string; confidence: "high" | "medium" | "low"; source_count: number };
}) {
  const dots = { high: 5, medium: 3, low: 1 }[stage.confidence];
  const bg = stage.confidence === "low" ? "#FFFDE6" : "#FFFFFF";
  const border = stage.confidence === "low" ? "#FFF599" : "#DAD9D6";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="rounded-[6px] border-2 px-3 py-2"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <p className="text-[14px] font-semibold text-foreground">{stage.label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                i < dots ? "bg-deep-blue-800" : "bg-grey-300"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-grey-700">
          {stage.source_count > 0 ? `${stage.source_count} mention${stage.source_count === 1 ? "" : "s"}` : "—"}
        </span>
      </div>
    </motion.div>
  );
}
