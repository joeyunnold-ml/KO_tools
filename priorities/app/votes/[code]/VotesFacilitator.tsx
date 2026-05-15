"use client";

import { useEffect, useState } from "react";
import { useVotes } from "@/lib/useVotes";
import { getFacilitatorToken } from "@/lib/storage";
import { advancePhase } from "@/lib/actions";
import type { Phase } from "@/lib/types";
import SetupView from "./phases/SetupView";
import CaptureView from "./phases/CaptureView";
import VoteProgressView from "./phases/VoteProgressView";
import AssignView from "./phases/AssignView";
import ReadOnlyView from "./phases/ReadOnlyView";

export default function VotesFacilitator({ roomCode }: { roomCode: string }) {
  const state = useVotes(roomCode);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.session) setToken(getFacilitatorToken(state.session.id));
  }, [state.session]);

  if (state.loading) {
    return <main className="flex-1 flex items-center justify-center text-grey-700">⏳ Loading…</main>;
  }
  if (state.error || !state.session) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">🤔 Session not found</h1>
          <p className="mt-2 text-grey-800">Check the room code and try again.</p>
        </div>
      </main>
    );
  }

  const isFacilitator = !!token;

  // Non-facilitator visitors get the read-only artifact view. This makes
  // /votes/[code] the shareable post-workshop URL — anyone can open it and
  // see the commitment table.
  if (!isFacilitator) {
    return <ReadOnlyView state={state} />;
  }

  async function setPhase(to: Phase) {
    if (!state.session || !token) return;
    await advancePhase({ sessionId: state.session.id, facilitatorToken: token, to });
  }

  async function openSession() {
    if (!state.session || !token) return;
    if (state.priorities.length === 0) {
      if (!window.confirm("No priorities pre-loaded. Open anyway?")) return;
    }
    setBusy(true);
    try {
      const next: Phase = state.session.capture_enabled ? "capture" : "vote";
      await setPhase(next);
    } finally {
      setBusy(false);
    }
  }

  async function closeCapture() {
    if (!state.session || !token) return;
    if (state.priorities.length === 0) {
      window.alert("No priorities to vote on yet.");
      return;
    }
    setBusy(true);
    try {
      await setPhase("vote");
    } finally {
      setBusy(false);
    }
  }

  async function closeVoting() {
    if (!state.session || !token) return;
    const real = state.participants.filter((p) => !p.is_facilitator);
    const voted = new Set(state.votes.map((v) => v.participant_id));
    const remaining = real.filter((p) => !voted.has(p.id)).length;
    if (remaining > 0) {
      if (!window.confirm(`${remaining} participant${remaining === 1 ? "" : "s"} haven't voted. Close anyway?`)) return;
    }
    setBusy(true);
    try {
      await setPhase("assign");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!window.confirm("Mark this session complete? The commitment table will become a shareable read-only artifact.")) return;
    setBusy(true);
    try {
      await setPhase("complete");
    } finally {
      setBusy(false);
    }
  }

  const phase = state.session.phase;

  return (
    <main className="flex-1 flex flex-col">
      {phase === "setup" || phase === "lobby" ? (
        <SetupView state={state} token={token!} onOpen={openSession} busy={busy} />
      ) : phase === "capture" ? (
        <CaptureView state={state} onClose={closeCapture} busy={busy} />
      ) : phase === "vote" ? (
        <VoteProgressView state={state} onClose={closeVoting} busy={busy} />
      ) : phase === "assign" ? (
        <AssignView state={state} token={token!} onComplete={complete} busy={busy} />
      ) : (
        <ReadOnlyView state={state} />
      )}
    </main>
  );
}
