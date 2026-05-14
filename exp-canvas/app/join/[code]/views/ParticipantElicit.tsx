"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CanvasState } from "@/lib/useCanvas";
import { submitLifecycle } from "@/lib/actions";

const MAX_STAGE_LEN = 60;

export default function ParticipantElicit({
  state,
  participantId,
}: {
  state: CanvasState;
  participantId: string;
}) {
  const mine = useMemo(
    () => state.submissions.find((s) => s.participant_id === participantId) ?? null,
    [state.submissions, participantId],
  );

  // Local draft state. We seed from mine if it exists (reload safety), else start with two empty fields.
  const [stages, setStages] = useState<string[]>(() =>
    mine && mine.stages.length > 0 ? [...mine.stages] : ["", ""],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(!!mine);

  // Re-seed when our submission row appears via realtime
  useEffect(() => {
    if (mine && !submitted) {
      setStages([...mine.stages]);
      setSubmitted(true);
    }
  }, [mine, submitted]);

  const filled = stages.map((s) => s.trim()).filter(Boolean);
  const canSubmit = filled.length >= 2;
  const totalSubmittedParticipants = new Set(state.submissions.map((s) => s.participant_id)).size;

  function updateStage(i: number, val: string) {
    setStages((prev) => prev.map((s, idx) => (idx === i ? val.slice(0, MAX_STAGE_LEN) : s)));
  }

  function removeStage(i: number) {
    setStages((prev) => (prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== i)));
  }

  function addStage() {
    setStages((prev) => [...prev, ""]);
  }

  function moveStage(i: number, dir: -1 | 1) {
    setStages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.canvas || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitLifecycle({
        canvasId: state.canvas.id,
        participantId,
        stages: filled,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Submitted state ----
  if (submitted) {
    return (
      <main className="flex-1 flex flex-col p-5 bg-grey-100">
        <div className="max-w-md mx-auto w-full">
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">✅ Submitted</p>
          <h1 className="text-[22px] font-medium leading-snug text-foreground mb-4">
            Here&apos;s what you sent
          </h1>
          <ol className="space-y-2 mb-6">
            {(mine?.stages ?? filled).map((s, i) => (
              <li key={i} className="rounded-[8px] bg-white border border-border p-3 text-sm flex items-baseline gap-3">
                <span className="text-[14px] font-bold tabular-nums text-grey-500">{i + 1}.</span>
                <span className="text-foreground">{s}</span>
              </li>
            ))}
          </ol>
          <button
            onClick={() => setSubmitted(false)}
            className="text-sm text-grey-700 hover:text-foreground underline mb-4"
          >
            ✏️ Edit your list
          </button>
          <p className="text-xs text-grey-600 text-center mt-6">
            ⏳ Waiting for the facilitator… {totalSubmittedParticipants} of {state.participants.length} have submitted
          </p>
        </div>
      </main>
    );
  }

  // ---- Editing state ----
  return (
    <main className="flex-1 flex flex-col p-5 bg-grey-100">
      <div className="max-w-md mx-auto w-full">
        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">💭 Prompt</p>
        <h1 className="text-[20px] font-medium leading-snug text-foreground mb-1">
          🧬 What are the stages an experiment goes through here — from idea to production?
        </h1>
        <p className="text-[13px] text-grey-700 mb-5">
          List them in order. Most people list 4–8 stages.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <AnimatePresence mode="popLayout">
            {stages.map((s, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                <div className="flex flex-col gap-0">
                  <button
                    type="button"
                    onClick={() => moveStage(i, -1)}
                    disabled={i === 0}
                    className="text-grey-500 hover:text-foreground text-xs leading-none disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(i, 1)}
                    disabled={i === stages.length - 1}
                    className="text-grey-500 hover:text-foreground text-xs leading-none disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>
                <span className="text-sm font-medium text-grey-700 tabular-nums w-5 text-right">{i + 1}.</span>
                <input
                  value={s}
                  onChange={(e) => updateStage(i, e.target.value)}
                  placeholder={i === 0 ? "Identify" : i === 1 ? "Hypothesize" : "Stage…"}
                  className="flex-1 h-[42px] rounded-[4px] border border-border px-[14px] text-base bg-white focus:outline-none focus:border-foreground"
                />
                <button
                  type="button"
                  onClick={() => removeStage(i)}
                  disabled={stages.length === 1}
                  className="text-grey-500 hover:text-[var(--error-fg)] disabled:opacity-30 px-1"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            type="button"
            onClick={addStage}
            className="text-sm text-grey-700 hover:text-foreground py-2"
          >
            ➕ Add another stage
          </button>

          <div className="pt-3">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full h-[44px] rounded-[4px] bg-deep-blue-800 text-white text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-40"
            >
              {submitting ? "⏳ Submitting…" : "📤 Submit →"}
            </button>
            {!canSubmit ? (
              <p className="text-xs text-grey-600 text-center mt-2">List at least 2 stages.</p>
            ) : null}
            {error ? <p className="text-xs text-[var(--error-fg)] text-center mt-2">{error}</p> : null}
          </div>
        </form>

        <p className="mt-8 text-xs text-grey-600 text-center">
          📊 {totalSubmittedParticipants} of {state.participants.length} participants have submitted
        </p>
      </div>
    </main>
  );
}
