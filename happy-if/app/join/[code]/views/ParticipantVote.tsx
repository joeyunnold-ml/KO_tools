"use client";

import { useState } from "react";
import type { SessionState } from "@/lib/useSession";
import { castVote, removeOneVote } from "@/lib/actions";

const TOTAL_VOTES = 3;

export default function ParticipantVote({
  state,
  participantId,
}: {
  state: SessionState;
  participantId: string;
}) {
  const groups = [...state.groups].sort((a, b) => a.sort_order - b.sort_order);
  const myVotes = state.votes.filter((v) => v.participant_id === participantId);
  const myCountByGroup = new Map<string, number>();
  for (const v of myVotes) {
    myCountByGroup.set(v.group_id, (myCountByGroup.get(v.group_id) ?? 0) + 1);
  }
  const remaining = TOTAL_VOTES - myVotes.length;
  const [busy, setBusy] = useState(false);

  async function addVote(groupId: string) {
    if (remaining <= 0 || !state.session) return;
    setBusy(true);
    try { await castVote({ sessionId: state.session.id, participantId, groupId }); } catch (e) { console.error(e); } finally { setBusy(false); }
  }
  async function removeVote(groupId: string) {
    setBusy(true);
    try { await removeOneVote({ participantId, groupId }); } catch (e) { console.error(e); } finally { setBusy(false); }
  }

  return (
    <main className="flex-1 flex flex-col p-4 bg-grey-100">
      <div className="max-w-md mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-[22px] font-medium mb-2 text-foreground">🗳️ Place your 3 votes</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-grey-700">⚪ Remaining:</span>
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_VOTES }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block w-3 h-3 rounded-full ${
                    i < remaining ? "bg-deep-blue-800" : "bg-grey-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <ul className="space-y-3">
          {groups.map((g) => {
            const myCount = myCountByGroup.get(g.id) ?? 0;
            return (
              <li key={g.id} className="rounded-[8px] bg-white border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-base flex-1 pr-3 text-foreground">{g.label}</h3>
                  <button
                    onClick={() => addVote(g.id)}
                    disabled={remaining <= 0 || busy}
                    className="rounded-[4px] bg-deep-blue-800 text-white w-11 h-11 text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-30"
                  >
                    +1
                  </button>
                </div>
                {myCount > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {Array.from({ length: myCount }).map((_, i) => (
                        <span key={i} className="inline-block w-3 h-3 rounded-full bg-deep-blue-800" />
                      ))}
                    </div>
                    <button
                      onClick={() => removeVote(g.id)}
                      disabled={busy}
                      className="text-xs text-grey-700 hover:text-[var(--error-fg)] underline"
                    >
                      ➖ remove one
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-xs text-grey-600 text-center">
          🔄 You can change your votes until the facilitator closes voting.
        </p>
      </div>
    </main>
  );
}
