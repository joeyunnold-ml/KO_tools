"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import { castVote, removeOneVote } from "@/lib/actions";
import { paletteFor } from "@/lib/palette";

const VOTES_PER_QUESTION = 3;

export default function ParticipantVote({
  state,
  participantId,
}: {
  state: SessionState;
  participantId: string;
}) {
  const questions = useMemo(
    () => [...state.questions].sort((a, b) => a.sort_order - b.sort_order),
    [state.questions],
  );

  // groupId → questionId
  const groupQuestionMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const g of state.groups) m.set(g.id, g.question_id);
    return m;
  }, [state.groups]);

  // My votes per question
  const myVotesByQuestion = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of state.votes) {
      if (v.participant_id !== participantId) continue;
      const qId = groupQuestionMap.get(v.group_id);
      if (!qId) continue;
      m.set(qId, (m.get(qId) ?? 0) + 1);
    }
    return m;
  }, [state.votes, participantId, groupQuestionMap]);

  // Default to first question that has remaining votes
  const firstUnfinishedIdx = questions.findIndex(
    (q) => (myVotesByQuestion.get(q.id) ?? 0) < VOTES_PER_QUESTION,
  );
  const [idx, setIdx] = useState(firstUnfinishedIdx === -1 ? 0 : firstUnfinishedIdx);

  useEffect(() => {
    if (idx >= questions.length) setIdx(Math.max(0, questions.length - 1));
  }, [questions.length, idx]);

  const [busy, setBusy] = useState(false);

  if (questions.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-grey-100">
        <p className="text-grey-700">No prompts.</p>
      </main>
    );
  }

  const activeQ = questions[idx];
  if (!activeQ) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-grey-100">
        <p className="text-grey-700">Loading…</p>
      </main>
    );
  }
  const usedThisQ = myVotesByQuestion.get(activeQ.id) ?? 0;
  const remainingThisQ = VOTES_PER_QUESTION - usedThisQ;
  const groups = state.groups
    .filter((g) => g.question_id === activeQ.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const myCountByGroup = new Map<string, number>();
  for (const v of state.votes) {
    if (v.participant_id !== participantId) continue;
    if (groupQuestionMap.get(v.group_id) !== activeQ.id) continue;
    myCountByGroup.set(v.group_id, (myCountByGroup.get(v.group_id) ?? 0) + 1);
  }

  async function addVote(groupId: string) {
    if (remainingThisQ <= 0 || !state.session) return;
    setBusy(true);
    try {
      await castVote({ sessionId: state.session.id, participantId, groupId });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }
  async function removeVote(groupId: string) {
    setBusy(true);
    try {
      await removeOneVote({ participantId, groupId });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col p-4 bg-grey-100">
      <div className="max-w-md mx-auto w-full">
        {/* Wizard nav */}
        {questions.length > 1 ? (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="text-sm text-grey-700 hover:text-foreground disabled:opacity-30"
            >
              ← Prev
            </button>
            <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700">
              Prompt {idx + 1} of {questions.length}
            </p>
            <button
              onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
              disabled={idx === questions.length - 1}
              className="text-sm text-grey-700 hover:text-foreground disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        ) : null}

        {/* Pip indicator */}
        {questions.length > 1 ? (
          <div className="flex gap-1.5 mb-4 justify-center">
            {questions.map((q, i) => {
              const used = myVotesByQuestion.get(q.id) ?? 0;
              const done = used >= VOTES_PER_QUESTION;
              return (
                <button
                  key={q.id}
                  onClick={() => setIdx(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === idx
                      ? "bg-deep-blue-800"
                      : done
                        ? "bg-deep-blue-800/40"
                        : "bg-grey-300"
                  }`}
                  aria-label={`Go to prompt ${i + 1}`}
                />
              );
            })}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeQ.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mb-4">
              <h1 className="text-[20px] font-medium mb-1 text-foreground">
                🗳️ Place your {VOTES_PER_QUESTION} votes
              </h1>
              <p className="text-[13px] text-grey-800 italic mb-3">{activeQ.text}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-grey-700">⚪ Remaining:</span>
                <div className="flex gap-1">
                  {Array.from({ length: VOTES_PER_QUESTION }).map((_, i) => (
                    <span
                      key={i}
                      className={`inline-block w-3 h-3 rounded-full ${
                        i < remainingThisQ ? "bg-deep-blue-800" : "bg-grey-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <ul className="space-y-3">
              {groups.map((g, gIdx) => {
                const palette = paletteFor(gIdx);
                const myCount = myCountByGroup.get(g.id) ?? 0;
                return (
                  <motion.li
                    key={g.id}
                    layout
                    className="rounded-[8px] border-2 p-4"
                    style={{ backgroundColor: palette.bg, borderColor: palette.border }}
                  >
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <h3 className="font-semibold text-base flex-1" style={{ color: palette.text }}>
                        {g.label}
                      </h3>
                      <button
                        onClick={() => addVote(g.id)}
                        disabled={remainingThisQ <= 0 || busy}
                        className="rounded-[4px] bg-deep-blue-800 text-white w-11 h-11 text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-30 flex-shrink-0"
                      >
                        +1
                      </button>
                    </div>
                    {myCount > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {Array.from({ length: myCount }).map((_, i) => (
                            <span
                              key={i}
                              className="inline-block w-3 h-3 rounded-full"
                              style={{ backgroundColor: palette.text }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => removeVote(g.id)}
                          disabled={busy}
                          className="text-xs text-grey-700 hover:text-[var(--error-fg)] underline"
                        >
                          ➖ remove vote
                        </button>
                      </div>
                    ) : null}
                  </motion.li>
                );
              })}
              {groups.length === 0 ? (
                <p className="text-sm text-grey-600 italic">No groups for this prompt.</p>
              ) : null}
            </ul>
          </motion.div>
        </AnimatePresence>

        <p className="mt-6 text-xs text-grey-600 text-center">
          🔄 You can change your votes until the facilitator closes voting.
        </p>
      </div>
    </main>
  );
}
