"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import type { ParticipantRow } from "@/lib/types";
import { paletteFor, pillColorForParticipant } from "@/lib/palette";

const VOTES_PER_QUESTION = 3;

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
  const questions = useMemo(
    () => [...state.questions].sort((a, b) => a.sort_order - b.sort_order),
    [state.questions],
  );
  const totalVotesPerParticipant = VOTES_PER_QUESTION * questions.length;

  // group_id → question_id
  const groupQuestionMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const g of state.groups) m.set(g.id, g.question_id);
    return m;
  }, [state.groups]);

  // Per-participant: how many questions they've fully voted on
  const participantsWithProgress = useMemo(() => {
    // Count votes per participant per question
    const counts = new Map<string, Map<string, number>>(); // participantId → questionId → count
    for (const v of state.votes) {
      const qId = groupQuestionMap.get(v.group_id);
      if (!qId) continue;
      let m = counts.get(v.participant_id);
      if (!m) {
        m = new Map();
        counts.set(v.participant_id, m);
      }
      m.set(qId, (m.get(qId) ?? 0) + 1);
    }
    return state.participants
      .map((p) => {
        const myCounts = counts.get(p.id) ?? new Map();
        const fullyVotedQs = questions.filter((q) => (myCounts.get(q.id) ?? 0) >= VOTES_PER_QUESTION).length;
        const totalUsed = Array.from(myCounts.values()).reduce((a, b) => a + b, 0);
        return { p, fullyVotedQs, totalUsed };
      })
      .sort((a, b) => {
        if (a.fullyVotedQs !== b.fullyVotedQs) return a.fullyVotedQs - b.fullyVotedQs;
        return a.p.name.localeCompare(b.p.name);
      });
  }, [state.participants, state.votes, groupQuestionMap, questions]);

  const fullyDone = participantsWithProgress.filter((x) => x.fullyVotedQs === questions.length).length;
  const total = participantsWithProgress.length;
  const pct = total ? (fullyDone / total) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-[28px] font-medium text-foreground">🗳️ Voting in progress</h1>
        <div className="text-[18px] text-grey-800">
          🧮 <span className="font-medium text-foreground">{fullyDone}</span> of {total} fully done
          {questions.length > 1 ? (
            <span className="ml-2 text-[14px] text-grey-700">
              ({VOTES_PER_QUESTION} votes × {questions.length} prompts = {totalVotesPerParticipant} per person)
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-8">
        <div className="h-3 rounded-full bg-grey-200 overflow-hidden">
          <motion.div
            className="h-full bg-deep-blue-800"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 150, damping: 24 }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-4">
          👥 Voting progress
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {participantsWithProgress.map(({ p, fullyVotedQs }) => (
            <ParticipantRowCard
              key={p.id}
              participant={p}
              fullyVotedQs={fullyVotedQs}
              totalQuestions={questions.length}
            />
          ))}
        </div>

        {questions.length > 0 ? (
          <>
            <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mt-10 mb-4">
              🗂️ Voting on
            </p>
            {questions.map((q, qIdx) => {
              const qGroups = state.groups
                .filter((g) => g.question_id === q.id)
                .sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div key={q.id} className="mb-4">
                  {questions.length > 1 ? (
                    <p className="text-[14px] font-medium text-foreground mb-2">
                      <span className="text-grey-600 mr-1">{qIdx + 1}.</span>
                      {q.text}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {qGroups.map((g, idx) => {
                      const palette = paletteFor(idx);
                      return (
                        <span
                          key={g.id}
                          className="inline-flex items-center px-3 py-1.5 rounded-[6px] border-2 text-[13px] font-medium"
                          style={{
                            backgroundColor: palette.bg,
                            borderColor: palette.border,
                            color: palette.text,
                          }}
                        >
                          {g.label}
                        </span>
                      );
                    })}
                    {qGroups.length === 0 ? (
                      <span className="text-xs text-grey-600 italic">(no groups for this prompt)</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </>
        ) : null}
      </div>

      <div className="mt-8 flex justify-end items-center gap-4 flex-wrap">
        {fullyDone < total ? (
          <p className="text-base text-grey-700">
            ⏳ Waiting on:{" "}
            <span className="font-medium text-foreground">
              {participantsWithProgress
                .filter((x) => x.fullyVotedQs < questions.length)
                .map((x) => x.p.name)
                .join(", ")}
            </span>
          </p>
        ) : (
          <p className="text-base text-foreground font-medium">✅ All votes are in.</p>
        )}
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

export function VoteDots({ count, color = "#000F1E" }: { count: number; color?: string }) {
  const shown = Math.min(count, 30);
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      ))}
      {count > shown ? <span className="text-xs text-grey-700 ml-1">+{count - shown}</span> : null}
    </div>
  );
}

function ParticipantRowCard({
  participant,
  fullyVotedQs,
  totalQuestions,
}: {
  participant: ParticipantRow;
  fullyVotedQs: number;
  totalQuestions: number;
}) {
  const done = fullyVotedQs >= totalQuestions;
  const pill = pillColorForParticipant(participant.id);

  return (
    <motion.div
      layout
      layoutId={`vote-progress-${participant.id}`}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className={`rounded-[8px] border-2 p-4 flex items-center gap-3 ${
        done ? "bg-white" : "bg-grey-100"
      }`}
      style={{ borderColor: done ? "var(--success-fg)" : "var(--border)" }}
    >
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap flex-shrink-0"
        style={{ backgroundColor: pill.bg, color: pill.fg }}
      >
        {participant.name}
      </span>
      <div className="flex-1 text-right text-[13px] text-grey-800">
        <span className="font-medium text-foreground">{fullyVotedQs}</span> / {totalQuestions}{" "}
        prompts
      </div>
      {done ? (
        <motion.span
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 16 }}
          className="text-lg flex-shrink-0"
        >
          ✅
        </motion.span>
      ) : null}
    </motion.div>
  );
}
