"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import { paletteFor } from "@/lib/palette";
import ResponsePill from "@/components/ResponsePill";

export default function ParticipantCluster({
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
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeQuestionId && questions.length > 0) {
      setActiveQuestionId(questions[0].id);
    }
  }, [activeQuestionId, questions]);

  const participantsById = useMemo(
    () => new Map(state.participants.map((p) => [p.id, p])),
    [state.participants],
  );

  if (questions.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-grey-100">
        <p className="text-grey-700">No prompts.</p>
      </main>
    );
  }

  const activeQ = questions.find((q) => q.id === activeQuestionId) ?? questions[0];
  const groups = state.groups
    .filter((g) => g.question_id === activeQ.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const unclustered = state.responses.filter(
    (r) => r.question_id === activeQ.id && r.group_id === null,
  );

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 lg:p-10 bg-grey-100">
      <div className="max-w-2xl md:max-w-5xl lg:max-w-6xl mx-auto w-full">
        <h1 className="text-[22px] md:text-[28px] font-medium mb-1 text-foreground">
          🗂️ Grouping responses
        </h1>
        <p className="text-sm md:text-base text-grey-700 mb-3 md:mb-5">
          👀 Follow along with the facilitator.
        </p>

        {questions.length > 1 ? (
          <div className="flex gap-1 mb-4 md:mb-5 overflow-x-auto border-b border-border">
            {questions.map((q, i) => {
              const active = q.id === activeQ.id;
              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`relative px-3 md:px-4 py-2 md:py-2.5 text-[13px] md:text-[14px] font-medium whitespace-nowrap flex-shrink-0 max-w-[260px] truncate ${
                    active ? "text-foreground" : "text-grey-700 hover:text-foreground"
                  }`}
                  title={q.text}
                >
                  <span className="text-grey-500 mr-1">{i + 1}.</span>
                  {q.text.length > 36 ? q.text.slice(0, 36) + "…" : q.text}
                  {active ? (
                    <motion.span
                      layoutId="p-cluster-tab-underline"
                      className="absolute left-0 right-0 -bottom-px h-[2px] bg-foreground"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        <p className="text-[13px] md:text-[15px] text-grey-800 mb-4 md:mb-6 italic">
          {activeQ.text}
        </p>

        {/* Groups: 1 column on mobile, 2 columns on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <AnimatePresence mode="popLayout">
            {groups.map((g, idx) => {
              const palette = paletteFor(idx);
              const items = state.responses.filter((r) => r.group_id === g.id);
              return (
                <motion.section
                  key={g.id}
                  layout
                  layoutId={`p-group-${g.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 240, damping: 22 }}
                  className="rounded-[8px] border-2 p-4 md:p-5"
                  style={{ backgroundColor: palette.bg, borderColor: palette.border }}
                >
                  <h2
                    className="text-[16px] md:text-[18px] font-semibold mb-3"
                    style={{ color: palette.text }}
                  >
                    {g.label}{" "}
                    <span className="opacity-50 font-normal">({items.length})</span>
                  </h2>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {items.map((r) => {
                        const p = participantsById.get(r.participant_id);
                        return (
                          <motion.div
                            key={r.id}
                            layout
                            layoutId={`p-response-${r.id}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          >
                            <ResponsePill
                              response={r}
                              participantName={p?.name ?? "—"}
                              participantId={r.participant_id}
                              palette={palette}
                              compact
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </div>

        {unclustered.length > 0 ? (
          <section className="mt-6 md:mt-8">
            <h2 className="text-[13px] md:text-[14px] font-medium uppercase tracking-[2px] text-grey-700 mb-2 md:mb-3">
              📋 Unclustered ({unclustered.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
              <AnimatePresence mode="popLayout">
                {unclustered.map((r) => {
                  const p = participantsById.get(r.participant_id);
                  return (
                    <motion.div
                      key={r.id}
                      layout
                      layoutId={`p-response-${r.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    >
                      <ResponsePill
                        response={r}
                        participantName={p?.name ?? "—"}
                        participantId={r.participant_id}
                        compact
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
