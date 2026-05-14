"use client";

import { motion } from "motion/react";
import type { CanvasState } from "@/lib/useCanvas";

export default function ElicitView({
  state,
  onClose,
  synthesizing,
  synthError,
}: {
  state: CanvasState;
  onClose: () => void;
  synthesizing: boolean;
  synthError: string | null;
}) {
  const realParticipants = state.participants.filter((p) => !p.is_facilitator);
  const submitted = new Set(state.submissions.map((s) => s.participant_id));
  const submittedCount = realParticipants.filter((p) => submitted.has(p.id)).length;
  const total = realParticipants.length;
  const waiting = realParticipants.filter((p) => !submitted.has(p.id));
  const pct = total ? (submittedCount / total) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
      <div className="max-w-3xl w-full">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-6">
          💭 Prompt
        </p>
        <h1 className="text-[48px] font-bold tracking-tight text-foreground leading-[1.2]">
          🧬 What are the stages an experiment goes through here — from idea to production?
        </h1>

        <div className="mt-16">
          <p className="text-[22px] font-medium text-foreground mb-4">
            📥 {submittedCount} of {total} submitted
          </p>
          <div className="h-3 rounded-full bg-grey-200 overflow-hidden">
            <motion.div
              className="h-full bg-deep-blue-800"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 150, damping: 24 }}
            />
          </div>
        </div>

        {waiting.length > 0 ? (
          <p className="mt-8 text-[18px] text-grey-800">
            ⏳ Waiting:{" "}
            <span className="font-medium text-foreground">
              {waiting.map((p) => p.name).join(", ")}
            </span>
          </p>
        ) : (
          <p className="mt-8 text-[18px] text-foreground font-medium">✅ All submissions in.</p>
        )}

        {synthError ? (
          <div className="mt-8 rounded-[8px] bg-[var(--error-bg)] border border-[var(--error-fg)] px-4 py-3 text-sm text-[var(--error-fg)] text-left">
            ⚠️ Synthesis failed: <span className="font-mono text-xs">{synthError}</span>. Try
            again, or skip to defaults after the reveal screen.
          </div>
        ) : null}

        <div className="mt-12">
          <button
            onClick={onClose}
            disabled={synthesizing || state.submissions.length === 0}
            className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40"
          >
            {synthesizing ? "🤖 Synthesizing…" : "🔒 Close submissions →"}
          </button>
        </div>

        {synthesizing ? (
          <p className="mt-4 text-[14px] text-grey-700">
            Asking the AI to look for patterns across submissions…
          </p>
        ) : null}
      </div>
    </div>
  );
}
