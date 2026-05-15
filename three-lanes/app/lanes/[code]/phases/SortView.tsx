"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { LaneState } from "@/lib/useLanes";
import { pillColorForParticipant, teamColor } from "@/lib/palette";

export default function SortView({
  state,
  onClose,
  busy,
  analyzeError,
}: {
  state: LaneState;
  onClose: () => void;
  busy: boolean;
  analyzeError: string | null;
}) {
  const realParticipants = state.participants.filter((p) => !p.is_facilitator);
  const itemCount = state.items.length;
  const classificationsByParticipant = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of state.classifications) {
      m.set(c.participant_id, (m.get(c.participant_id) ?? 0) + 1);
    }
    return m;
  }, [state.classifications]);

  const progress = realParticipants
    .map((p) => ({ p, done: classificationsByParticipant.get(p.id) ?? 0 }))
    .sort((a, b) => {
      // incomplete first
      const aDone = a.done >= itemCount ? 1 : 0;
      const bDone = b.done >= itemCount ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.p.name.localeCompare(b.p.name);
    });

  const doneCount = progress.filter((x) => x.done >= itemCount).length;
  const pct = realParticipants.length ? (doneCount / realParticipants.length) * 100 : 0;
  const waiting = progress.filter((x) => x.done < itemCount);

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
            🗂️ Blind sort
          </p>
          <h1 className="text-[28px] font-medium text-foreground">
            Sorting in progress
          </h1>
        </div>
        <div className="text-[18px] text-grey-800">
          ✅ <span className="font-medium text-foreground">{doneCount}</span> of {realParticipants.length} finished
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
        <p className="mt-3 text-[14px] text-grey-700">
          🧩 {itemCount} item{itemCount === 1 ? "" : "s"} to classify per participant
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-4">
          👥 Sorting progress
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {progress.map(({ p, done }) => {
            const isDone = done >= itemCount;
            const pill = pillColorForParticipant(p.id);
            const tc = teamColor(p.team);
            return (
              <motion.div
                key={p.id}
                layout
                layoutId={`sort-progress-${p.id}`}
                transition={{ type: "spring", stiffness: 240, damping: 22 }}
                className={`rounded-[8px] border-2 p-4 flex items-center gap-3 ${
                  isDone ? "bg-white" : "bg-grey-100"
                }`}
                style={{ borderColor: isDone ? "var(--success-fg)" : "var(--border)" }}
              >
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: pill.bg, color: pill.fg }}
                >
                  {p.name}
                  <span className="opacity-60 text-[10px]">{tc.label}</span>
                </span>
                <div className="flex-1 text-right">
                  <span className="text-[13px] font-medium text-foreground">
                    {done} / {itemCount}
                  </span>
                </div>
                {isDone ? (
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
          })}
        </div>
      </div>

      {analyzeError ? (
        <div className="mt-6 rounded-[8px] bg-[var(--error-bg)] border border-[var(--error-fg)] px-4 py-3 text-sm text-[var(--error-fg)]">
          ⚠️ Analysis failed: <span className="font-mono text-xs">{analyzeError}</span>. Try again.
        </div>
      ) : null}

      <div className="mt-6 flex justify-end items-center gap-4 flex-wrap">
        {waiting.length > 0 ? (
          <p className="text-base text-grey-700">
            ⏳ Waiting on:{" "}
            <span className="font-medium text-foreground">
              {waiting.map((x) => x.p.name).join(", ")}
            </span>
          </p>
        ) : (
          <p className="text-base text-foreground font-medium">✅ Everyone finished.</p>
        )}
        <button
          onClick={onClose}
          disabled={busy}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40"
        >
          {busy ? "🤖 Analyzing…" : "🔒 Close sorting → analyze"}
        </button>
      </div>
    </div>
  );
}
