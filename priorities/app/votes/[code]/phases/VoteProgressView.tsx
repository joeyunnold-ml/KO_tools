"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { VoteState } from "@/lib/useVotes";
import { pillColorForParticipant, teamColor } from "@/lib/palette";

export default function VoteProgressView({
  state,
  onClose,
  busy,
}: {
  state: VoteState;
  onClose: () => void;
  busy: boolean;
}) {
  if (!state.session) return null;
  const votesPerPerson = state.session.votes_per_person;
  const realParticipants = state.participants.filter((p) => !p.is_facilitator);
  const priorities = [...state.priorities].sort((a, b) => a.sort_order - b.sort_order);

  const usedByParticipant = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of state.votes) m.set(v.participant_id, (m.get(v.participant_id) ?? 0) + 1);
    return m;
  }, [state.votes]);

  const progress = realParticipants
    .map((p) => ({ p, used: usedByParticipant.get(p.id) ?? 0 }))
    .sort((a, b) => {
      const aDone = a.used >= votesPerPerson ? 1 : 0;
      const bDone = b.used >= votesPerPerson ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.p.name.localeCompare(b.p.name);
    });

  const done = progress.filter((x) => x.used >= votesPerPerson).length;
  const total = realParticipants.length;
  const pct = total ? (done / total) * 100 : 0;
  const waiting = progress.filter((x) => x.used < votesPerPerson);

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
            🗳️ Voting
          </p>
          <h1 className="text-[28px] font-medium text-foreground">Voting in progress</h1>
        </div>
        <div className="text-[18px] text-grey-800">
          ✅ <span className="font-medium text-foreground">{done}</span> of {total} have voted
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
          📋 {priorities.length} priorit{priorities.length === 1 ? "y" : "ies"} · {votesPerPerson} vote{votesPerPerson === 1 ? "" : "s"} per person
        </p>
      </div>

      {/* Read-only priority list for the room to reference */}
      <div className="mb-8">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
          📋 Voting on
        </p>
        <div className="space-y-2 max-w-4xl">
          {priorities.map((p, i) => (
            <div key={p.id} className="rounded-[6px] border border-border bg-white p-3">
              <p className="text-[14px] font-medium text-foreground">
                <span className="text-grey-600 mr-1">{i + 1}.</span>
                {p.title}
              </p>
              {p.description ? (
                <p className="text-[12px] text-grey-700 mt-0.5">{p.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-4">
          👥 Voting progress
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {progress.map(({ p, used }) => {
            const isDone = used >= votesPerPerson;
            const pill = pillColorForParticipant(p.id);
            const tc = teamColor(p.team);
            return (
              <motion.div
                key={p.id}
                layout
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
                <div className="flex gap-1 flex-1 justify-end">
                  {Array.from({ length: votesPerPerson }).map((_, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        scale: i < used ? 1 : 0.85,
                        opacity: i < used ? 1 : 0.5,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className={`inline-block w-3.5 h-3.5 rounded-full ${
                        i < used ? "bg-deep-blue-800" : "bg-grey-300"
                      }`}
                    />
                  ))}
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

      <div className="mt-6 flex justify-end items-center gap-4 flex-wrap">
        {waiting.length > 0 ? (
          <p className="text-base text-grey-700">
            ⏳ Waiting on:{" "}
            <span className="font-medium text-foreground">
              {waiting.map((x) => x.p.name).join(", ")}
            </span>
          </p>
        ) : (
          <p className="text-base text-foreground font-medium">✅ Everyone has voted.</p>
        )}
        <button
          onClick={onClose}
          disabled={busy}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40"
        >
          {busy ? "Closing…" : "🏁 Close voting · Reveal results →"}
        </button>
      </div>
    </div>
  );
}
