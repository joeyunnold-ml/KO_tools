"use client";

import { useEffect, useState } from "react";
import { useLanes } from "@/lib/useLanes";
import { getFacilitatorToken } from "@/lib/storage";
import { advancePhase, runAnalysis } from "@/lib/actions";
import type { Phase } from "@/lib/types";
import SetupView from "./phases/SetupView";
import CaptureView from "./phases/CaptureView";
import SortView from "./phases/SortView";
import AnalyzeView from "./phases/AnalyzeView";
import ResultsView from "./phases/ResultsView";

export default function LanesFacilitator({ roomCode }: { roomCode: string }) {
  const state = useLanes(roomCode);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

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
  if (!isFacilitator) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold">🎤 Facilitator view</h1>
          <p className="mt-2 text-grey-800">
            You&apos;re viewing the facilitator screen for room{" "}
            <span className="font-mono">{roomCode}</span> in read-only mode. To participate,
            open <a className="underline" href={`/join/${roomCode}`}>/join/{roomCode}</a> on your phone.
          </p>
        </div>
      </main>
    );
  }

  async function setPhase(to: Phase) {
    if (!state.session || !token) return;
    await advancePhase({ sessionId: state.session.id, facilitatorToken: token, to });
  }

  // Open Session — advance from setup → first applicable phase
  async function openSession() {
    if (!state.session || !token) return;
    if (state.items.length === 0) {
      if (!window.confirm("No items pre-loaded. Open anyway? Participants will need to submit items in the capture phase.")) {
        return;
      }
    }
    setBusy(true);
    try {
      const next: Phase = state.session.capture_enabled
        ? "capture"
        : state.session.blind_sort_enabled
          ? "sort"
          : "results"; // direct discussion
      await setPhase(next);
    } finally {
      setBusy(false);
    }
  }

  async function closeCapture() {
    if (!state.session || !token) return;
    if (state.items.length === 0) {
      window.alert("No items to sort yet.");
      return;
    }
    setBusy(true);
    try {
      const next: Phase = state.session.blind_sort_enabled ? "sort" : "results";
      await setPhase(next);
    } finally {
      setBusy(false);
    }
  }

  async function closeSort() {
    if (!state.session || !token) return;
    const realParticipants = state.participants.filter((p) => !p.is_facilitator);
    const submittedSet = new Set(state.classifications.map((c) => c.participant_id));
    const incomplete = realParticipants.filter((p) => {
      const myClassifications = state.classifications.filter((c) => c.participant_id === p.id).length;
      return myClassifications < state.items.length;
    });
    if (incomplete.length > 0) {
      const ok = window.confirm(
        `${incomplete.length} participant${incomplete.length === 1 ? "" : "s"} haven't finished sorting (${incomplete.map((p) => p.name).join(", ")}). Their completed items will still be counted. Close sorting now?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setAnalyzeError(null);
    try {
      const r = await runAnalysis({ sessionId: state.session.id, facilitatorToken: token });
      if (!r.ok) {
        setAnalyzeError(r.error ?? "Analysis failed");
        // Surface a chance to retry — revert to sort phase so they can try again
        await setPhase("sort");
      }
      // On success, the API route advances phase to 'results' itself.
    } finally {
      setBusy(false);
    }
    // Unused: suppress warnings
    void submittedSet;
  }

  const phase = state.session.phase;

  return (
    <main className="flex-1 flex flex-col">
      {phase === "setup" || phase === "lobby" ? (
        <SetupView state={state} token={token!} onOpenSession={openSession} busy={busy} />
      ) : phase === "capture" ? (
        <CaptureView state={state} onClose={closeCapture} busy={busy} />
      ) : phase === "sort" ? (
        <SortView state={state} onClose={closeSort} busy={busy} analyzeError={analyzeError} />
      ) : phase === "analyze" ? (
        <AnalyzeView />
      ) : (
        <ResultsView state={state} token={token!} />
      )}
    </main>
  );
}
