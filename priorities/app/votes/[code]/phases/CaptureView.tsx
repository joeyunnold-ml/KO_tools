"use client";

import { motion, AnimatePresence } from "motion/react";
import type { VoteState } from "@/lib/useVotes";
import { deletePriority } from "@/lib/actions";
import { pillColorForParticipant, teamColor } from "@/lib/palette";

export default function CaptureView({
  state,
  onClose,
  busy,
}: {
  state: VoteState;
  onClose: () => void;
  busy: boolean;
}) {
  const priorities = [...state.priorities].sort((a, b) => a.sort_order - b.sort_order);
  const preloaded = priorities.filter((p) => p.is_preloaded);
  const submitted = priorities.filter((p) => !p.is_preloaded);
  const participants = state.participants.filter((p) => !p.is_facilitator);
  const participantsById = new Map(participants.map((p) => [p.id, p]));

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">📥 Capture</p>
          <h1 className="text-[28px] font-medium text-foreground">Collect suggestions</h1>
          <p className="text-[14px] text-grey-700 mt-1">
            {priorities.length} item{priorities.length === 1 ? "" : "s"} so far · {preloaded.length} pre-loaded · {submitted.length} from participants
          </p>
        </div>
        <button
          onClick={onClose}
          disabled={busy || priorities.length === 0}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-8 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40"
        >
          {busy ? "Closing…" : "🔒 Close suggestions · Start voting →"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 max-w-4xl">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {priorities.map((p, i) => {
              const submitter = p.submitted_by ? participantsById.get(p.submitted_by) : null;
              const pill = submitter ? pillColorForParticipant(submitter.id) : null;
              const tc = submitter ? teamColor(submitter.team) : null;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-[6px] border border-border bg-white p-3 flex items-start gap-3"
                >
                  <span className="text-sm font-medium text-grey-500 tabular-nums w-6 pt-0.5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground">{p.title}</p>
                    {p.description ? (
                      <p className="text-[12px] text-grey-700 mt-0.5">{p.description}</p>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {p.is_preloaded ? (
                        <span className="text-[10px] uppercase tracking-wider text-grey-600 bg-grey-100 px-1.5 py-0.5 rounded">
                          pre-loaded
                        </span>
                      ) : null}
                      {submitter && pill ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: pill.bg, color: pill.fg }}
                        >
                          {submitter.name}
                          {tc ? <span className="ml-1 opacity-60">{tc.label}</span> : null}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete "${p.title}"?`)) await deletePriority(p.id);
                    }}
                    className="text-xs text-grey-700 hover:text-[var(--error-fg)] px-1 flex-shrink-0"
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
