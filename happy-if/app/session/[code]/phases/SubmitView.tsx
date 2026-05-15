"use client";

import { motion } from "motion/react";
import type { SessionState } from "@/lib/useSession";

export default function SubmitView({
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
  const participants = state.participants;
  const questions = [...state.questions].sort((a, b) => a.sort_order - b.sort_order);
  const totalQuestions = questions.length;

  // Per-question: how many participants have submitted at least one response
  const perQuestion = questions.map((q) => {
    const submitted = new Set(
      state.responses.filter((r) => r.question_id === q.id).map((r) => r.participant_id),
    );
    return {
      question: q,
      submittedCount: participants.filter((p) => submitted.has(p.id)).length,
    };
  });

  // "Fully done": participant has at least one response to every question
  const fullyDone = participants.filter((p) => {
    const myQs = new Set(
      state.responses.filter((r) => r.participant_id === p.id).map((r) => r.question_id),
    );
    return questions.every((q) => myQs.has(q.id));
  }).length;

  const waiting = participants.filter((p) => {
    const myQs = new Set(
      state.responses.filter((r) => r.participant_id === p.id).map((r) => r.question_id),
    );
    return !questions.every((q) => myQs.has(q.id));
  });

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-12 bg-white">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2 text-center">
          💭 Submissions in progress
        </p>
        <h1 className="text-[28px] md:text-[36px] font-medium text-foreground text-center mb-1">
          Participants are answering {totalQuestions === 1 ? "the prompt" : `all ${totalQuestions} prompts`}
        </h1>

        <div className="mt-6 text-center">
          <p className="text-[22px] font-medium text-foreground">
            📥 {fullyDone} of {participants.length} fully done
          </p>
          <div className="h-3 rounded-full bg-grey-200 overflow-hidden mt-3 max-w-xl mx-auto">
            <motion.div
              className="h-full bg-deep-blue-800"
              animate={{ width: `${participants.length ? (fullyDone / participants.length) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 150, damping: 24 }}
            />
          </div>
        </div>

        {/* Per-question progress (only when there are multiple questions) */}
        {totalQuestions > 1 ? (
          <div className="mt-10 space-y-3">
            <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700">
              Per-prompt progress
            </p>
            {perQuestion.map(({ question, submittedCount }, i) => {
              const pct = participants.length ? (submittedCount / participants.length) * 100 : 0;
              return (
                <div key={question.id} className="rounded-[6px] bg-white border border-border p-3">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <p className="text-[14px] font-medium text-foreground flex-1 min-w-0 truncate">
                      <span className="text-grey-600 font-normal mr-1">{i + 1}.</span>
                      {question.text}
                    </p>
                    <span className="text-[13px] text-grey-800 flex-shrink-0">
                      {submittedCount} / {participants.length}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-grey-200 overflow-hidden">
                    <motion.div
                      className="h-full bg-deep-blue-800"
                      animate={{ width: `${pct}%` }}
                      transition={{ type: "spring", stiffness: 150, damping: 24 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-10 text-center text-[18px] text-grey-800">
          {waiting.length > 0 ? (
            <>
              ⏳ Waiting on:{" "}
              <span className="font-medium text-foreground">
                {waiting.map((p) => p.name).join(", ")}
              </span>
            </>
          ) : (
            <span className="text-foreground font-medium">✅ All submissions in.</span>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={onAdvance}
            disabled={advancing || state.responses.length === 0}
            className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40"
          >
            {advancing ? "Closing…" : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
