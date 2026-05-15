"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import { downloadMarkdown } from "@/lib/exportMarkdown";
import { paletteFor } from "@/lib/palette";
import { VoteDots } from "./VoteView";
import ResponsePill from "@/components/ResponsePill";

export default function ResultsView({ state }: { state: SessionState }) {
  const participantsById = useMemo(
    () => new Map(state.participants.map((p) => [p.id, p])),
    [state.participants],
  );
  const questions = useMemo(
    () => [...state.questions].sort((a, b) => a.sort_order - b.sort_order),
    [state.questions],
  );

  const multi = questions.length > 1;

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 bg-white overflow-hidden">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-[28px] font-medium text-foreground">
          🏆 Priorities{" "}
          <span className="text-grey-600 text-base font-normal">(ranked by votes)</span>
        </h1>
        <button
          onClick={() => downloadMarkdown(state)}
          className="h-[44px] rounded-[4px] bg-yellow-500 text-foreground px-6 text-sm font-medium hover:bg-yellow-600"
        >
          📥 Export results
        </button>
      </div>

      {/* Columns per question, scrollable horizontally if needed */}
      <div
        className={`flex-1 min-h-0 overflow-x-auto overflow-y-hidden ${multi ? "" : ""}`}
      >
        <div
          className="grid gap-4 h-full min-w-max"
          style={{
            gridTemplateColumns: `repeat(${Math.max(questions.length, 1)}, minmax(${multi ? "340px" : "100%"}, 1fr))`,
          }}
        >
          {questions.map((q, qIdx) => (
            <QuestionColumn
              key={q.id}
              question={q}
              questionIndex={qIdx}
              state={state}
              participantsById={participantsById}
              multi={multi}
            />
          ))}
          {questions.length === 0 ? (
            <p className="text-grey-600 italic p-4">No prompts.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuestionColumn({
  question,
  questionIndex,
  state,
  participantsById,
  multi,
}: {
  question: { id: string; text: string };
  questionIndex: number;
  state: SessionState;
  participantsById: Map<string, { name: string; id: string }>;
  multi: boolean;
}) {
  const qGroups = useMemo(
    () =>
      state.groups
        .filter((g) => g.question_id === question.id)
        .map((g) => {
          const total = state.votes.filter((v) => v.group_id === g.id).length;
          return { group: g, total, originalIndex: g.sort_order };
        })
        .sort((a, b) => b.total - a.total),
    [state.groups, state.votes, question.id],
  );

  return (
    <div className="flex flex-col min-h-0 h-full">
      {multi ? (
        <div className="mb-3 pb-2 border-b-2 border-foreground sticky top-0 bg-white z-10">
          <p className="text-[11px] font-medium uppercase tracking-[2px] text-grey-700">
            Prompt {questionIndex + 1}
          </p>
          <p className="text-[15px] font-medium text-foreground leading-snug" title={question.text}>
            {question.text}
          </p>
        </div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {qGroups.map((r, i) => {
          const palette = paletteFor(r.originalIndex);
          const responses = state.responses.filter((rsp) => rsp.group_id === r.group.id);
          return (
            <ResultRow
              key={r.group.id}
              rank={i}
              label={r.group.label}
              total={r.total}
              palette={palette}
              responses={responses}
              participantsById={participantsById}
              compact={multi}
            />
          );
        })}
        {qGroups.length === 0 ? (
          <p className="text-grey-600 italic text-sm">No groups for this prompt.</p>
        ) : null}
      </div>
    </div>
  );
}

function ResultRow({
  rank,
  label,
  total,
  palette,
  responses,
  participantsById,
  compact,
}: {
  rank: number;
  label: string;
  total: number;
  palette: ReturnType<typeof paletteFor>;
  responses: ReturnType<SessionState["responses"]["filter"]>;
  participantsById: Map<string, { name: string; id: string }>;
  compact: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const medal = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`;
  const padding = compact ? "p-4" : "p-6";
  const labelSize = compact ? "text-[16px]" : "text-[22px]";
  const numberSize = compact ? "text-[20px]" : "text-[28px]";
  const numberWidth = compact ? "w-10" : "w-14";

  return (
    <motion.div
      layout
      className={`rounded-[8px] border-2 ${padding}`}
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="flex items-baseline gap-3 mb-2">
          <span
            className={`${numberSize} font-bold tabular-nums ${numberWidth}`}
            style={{ color: palette.text }}
          >
            {medal}
          </span>
          <h2
            className={`${labelSize} font-medium flex-1 leading-snug`}
            style={{ color: palette.text }}
          >
            {label}
          </h2>
          <span
            className={`${numberSize} font-bold tabular-nums`}
            style={{ color: palette.text }}
          >
            {total}
          </span>
          <span className="text-grey-500 text-xs">{expanded ? "▾" : "▸"}</span>
        </div>
      </button>
      <div className={compact ? "pl-10" : "pl-14"}>
        <VoteDots count={total} color={palette.text} />
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {responses.map((r) => {
                  const p = participantsById.get(r.participant_id);
                  return (
                    <ResponsePill
                      key={r.id}
                      response={r}
                      participantName={p?.name ?? "—"}
                      participantId={r.participant_id}
                      palette={palette}
                      compact
                    />
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
