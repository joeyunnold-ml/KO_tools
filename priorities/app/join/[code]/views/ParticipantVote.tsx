"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { VoteState } from "@/lib/useVotes";
import { castVote, removeOneVote } from "@/lib/actions";

export default function ParticipantVote({
  state,
  participantId,
}: {
  state: VoteState;
  participantId: string;
}) {
  if (!state.session) return null;
  const votesPerPerson = state.session.votes_per_person;
  const priorities = useMemo(
    () => [...state.priorities].sort((a, b) => a.sort_order - b.sort_order),
    [state.priorities],
  );

  const myVotes = state.votes.filter((v) => v.participant_id === participantId);
  const used = myVotes.length;
  const remaining = votesPerPerson - used;

  const myCountByPriority = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of myVotes) m.set(v.priority_id, (m.get(v.priority_id) ?? 0) + 1);
    return m;
  }, [myVotes]);

  const [busy, setBusy] = useState(false);

  async function add(priorityId: string) {
    if (remaining <= 0 || !state.session) return;
    setBusy(true);
    try {
      await castVote({ sessionId: state.session.id, priorityId, participantId });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove(priorityId: string) {
    setBusy(true);
    try {
      await removeOneVote({ participantId, priorityId });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col bg-grey-100">
      {/* Sticky header with remaining count */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 md:px-8 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700">🗳️ Place your votes</p>
            <p className="text-[14px] text-grey-800 mt-0.5">You have {votesPerPerson} votes. Spread them or stack them.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-grey-700 uppercase tracking-wider">Remaining</span>
            <div className="flex gap-1">
              {Array.from({ length: votesPerPerson }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block w-3.5 h-3.5 rounded-full ${
                    i < remaining ? "bg-deep-blue-800" : "bg-grey-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {priorities.length === 0 ? (
            <p className="text-grey-600 italic text-center">No priorities to vote on.</p>
          ) : (
            <ul className="space-y-3">
              {priorities.map((p, i) => {
                const myCount = myCountByPriority.get(p.id) ?? 0;
                return (
                  <motion.li
                    key={p.id}
                    layout
                    className="rounded-[8px] border-2 border-border bg-white p-4 md:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-grey-500 tabular-nums w-6 pt-0.5">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] md:text-[18px] font-medium text-foreground leading-snug">
                          {p.title}
                        </h3>
                        {p.description ? (
                          <p className="text-[13px] text-grey-700 mt-1">{p.description}</p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => add(p.id)}
                        disabled={remaining <= 0 || busy}
                        className="rounded-[4px] bg-deep-blue-800 text-white w-11 h-11 md:w-12 md:h-12 text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-30 flex-shrink-0"
                      >
                        +1
                      </button>
                    </div>
                    {myCount > 0 ? (
                      <div className="mt-3 ml-9 flex items-center gap-3">
                        <div className="flex gap-1">
                          {Array.from({ length: myCount }).map((_, i) => (
                            <span key={i} className="inline-block w-3 h-3 rounded-full bg-deep-blue-800" />
                          ))}
                        </div>
                        <button
                          onClick={() => remove(p.id)}
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
            </ul>
          )}
          <p className="mt-6 text-xs text-grey-600 text-center">
            🔄 You can change your votes until the facilitator closes voting.
          </p>
        </div>
      </div>
    </main>
  );
}
