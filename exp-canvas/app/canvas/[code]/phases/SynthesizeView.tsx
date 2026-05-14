"use client";

import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { CanvasState } from "@/lib/useCanvas";
import { pillColorForParticipant } from "@/lib/palette";

type Tab = "synthesized" | "individual";

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
  const [tab, setTab] = useState<Tab>("synthesized");

  if (!state.canvas) return null;
  const synthesis = state.canvas.synthesis_result;
  const participantsById = new Map(state.participants.map((p) => [p.id, p]));
  const submissionCount = state.submissions.length;

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

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 border-b border-border">
        <TabButton active={tab === "synthesized"} onClick={() => setTab("synthesized")}>
          🤖 Synthesized
        </TabButton>
        <TabButton active={tab === "individual"} onClick={() => setTab("individual")}>
          👥 Individual submissions
          <span className="ml-1.5 text-grey-600 font-normal">({submissionCount})</span>
        </TabButton>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {tab === "synthesized" ? (
            <motion.div
              key="synthesized"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto pr-2"
            >
              {synthesis ? (
                <div className="space-y-5">
                  {/* Single-row stage flow with arrow connectors. Scrolls
                      horizontally if it overflows the screen rather than
                      wrapping to multiple lines. */}
                  <div className="flex items-center gap-3 overflow-x-auto pb-3 -mx-2 px-2">
                    {synthesis.stages.map((s, i) => (
                      <Fragment key={i}>
                        <ProposedStage stage={s} />
                        {i < synthesis.stages.length - 1 ? (
                          <StageArrow />
                        ) : null}
                      </Fragment>
                    ))}
                  </div>

                  <div className="rounded-[8px] bg-grey-100 border border-border p-4 max-w-5xl">
                    <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
                      📝 Narrative
                    </p>
                    <p className="text-[15px] leading-relaxed text-foreground">
                      {synthesis.narrative}
                    </p>
                  </div>

                  {synthesis.divergences && synthesis.divergences.length > 0 ? (
                    <div className="rounded-[8px] bg-white border border-border p-4 max-w-5xl">
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
                <div className="flex items-center justify-center h-full text-grey-700">
                  No synthesis result available.
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="individual"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto pr-2"
            >
              <div className="space-y-3">
                {state.submissions.map((sub, i) => {
                  const p = participantsById.get(sub.participant_id);
                  const pill = p ? pillColorForParticipant(p.id) : null;
                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-[8px] bg-white border border-border p-4"
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
                {state.submissions.length === 0 ? (
                  <div className="text-grey-700 text-sm">No submissions.</div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-[14px] font-medium transition-colors ${
        active ? "text-foreground" : "text-grey-700 hover:text-foreground"
      }`}
    >
      {children}
      {active ? (
        <motion.span
          layoutId="synth-tab-underline"
          className="absolute left-0 right-0 -bottom-px h-[2px] bg-foreground"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      ) : null}
    </button>
  );
}

function StageChain({ stages }: { stages: string[] }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] overflow-x-auto pb-1 -mx-1 px-1">
      {stages.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5 flex-shrink-0">
          <span className="inline-block px-2 py-1 rounded-[4px] bg-grey-100 border border-grey-200 text-foreground whitespace-nowrap">
            {s}
          </span>
          {i < stages.length - 1 ? <span className="text-grey-500">→</span> : null}
        </span>
      ))}
    </div>
  );
}

function StageArrow() {
  return (
    <div className="flex-shrink-0 flex items-center" aria-hidden>
      <svg
        width="32"
        height="14"
        viewBox="0 0 32 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="0" y1="7" x2="26" y2="7" stroke="#939598" strokeWidth="2" strokeLinecap="round" />
        <polyline
          points="22,2 30,7 22,12"
          fill="none"
          stroke="#939598"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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
      className="rounded-[6px] border-2 px-3 py-2 flex-shrink-0 whitespace-nowrap"
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
