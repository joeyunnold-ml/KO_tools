"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import type { ParticipantRow } from "@/lib/types";
import { paletteFor, pillColorForParticipant } from "@/lib/palette";

const VOTES_NEEDED = 3;

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
  const groups = [...state.groups].sort((a, b) => a.sort_order - b.sort_order);

  const participantsWithProgress = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of state.votes) {
      counts.set(v.participant_id, (counts.get(v.participant_id) ?? 0) + 1);
    }
    return state.participants
      .map((p) => ({ p, used: counts.get(p.id) ?? 0 }))
      .sort((a, b) => {
        if (a.used !== b.used) return a.used - b.used;
        return a.p.name.localeCompare(b.p.name);
      });
  }, [state.participants, state.votes]);

  const doneCount = participantsWithProgress.filter((x) => x.used >= VOTES_NEEDED).length;
  const total = participantsWithProgress.length;
  const pct = total ? (doneCount / total) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-[28px] font-medium text-foreground">🗳️ Voting in progress</h1>
        <div className="text-[18px] text-grey-800">
          🧮 <span className="font-medium text-foreground">{doneCount}</span> of {total} have voted
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
          <AnimatePresence mode="popLayout">
            {participantsWithProgress.map(({ p, used }) => (
              <ParticipantRowCard key={p.id} participant={p} used={used} />
            ))}
          </AnimatePresence>
        </div>

        {groups.length > 0 ? (
          <>
            <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mt-10 mb-4">
              🗂️ Voting on
            </p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g, idx) => {
                const palette = paletteFor(idx);
                return (
                  <span
                    key={g.id}
                    className="inline-flex items-center px-4 py-2 rounded-[6px] border-2 text-[14px] font-medium"
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
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-8 flex justify-end items-center gap-4">
        {doneCount < total ? (
          <p className="text-base text-grey-700">
            ⏳ Waiting on:{" "}
            <span className="font-medium text-foreground">
              {participantsWithProgress
                .filter((x) => x.used < VOTES_NEEDED)
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
        <span
          key={i}
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
      {count > shown ? <span className="text-xs text-grey-700 ml-1">+{count - shown}</span> : null}
    </div>
  );
}

function ParticipantRowCard({ participant, used }: { participant: ParticipantRow; used: number }) {
  const done = used >= VOTES_NEEDED;
  const pill = pillColorForParticipant(participant.id);

  return (
    <motion.div
      layout
      layoutId={`vote-progress-${participant.id}`}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className={`rounded-[8px] border-2 p-4 flex items-center gap-3 ${
        done ? "bg-white" : "bg-grey-100"
      }`}
      style={{
        borderColor: done ? "var(--success-fg)" : "var(--border)",
      }}
    >
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap flex-shrink-0"
        style={{ backgroundColor: pill.bg, color: pill.fg }}
      >
        {participant.name}
      </span>
      <div className="flex gap-1 flex-1 justify-end">
        {Array.from({ length: VOTES_NEEDED }).map((_, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={{
              scale: i < used ? 1 : 0.85,
              opacity: i < used ? 1 : 0.5,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={`inline-block w-4 h-4 rounded-full ${
              i < used ? "bg-deep-blue-800" : "bg-grey-300"
            }`}
          />
        ))}
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
