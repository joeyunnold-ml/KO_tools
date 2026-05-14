"use client";

import { useEffect, useState } from "react";
import { useCanvas } from "@/lib/useCanvas";
import {
  getFacilitatorToken,
  getFacilitatorParticipantId,
  saveFacilitatorParticipantId,
} from "@/lib/storage";
import {
  advancePhase,
  ensureFacilitatorParticipant,
  runSynthesis,
  seedDefaultStructure,
  seedStructure,
} from "@/lib/actions";
import type { Phase } from "@/lib/types";
import LobbyView from "./phases/LobbyView";
import ElicitView from "./phases/ElicitView";
import SynthesizeView from "./phases/SynthesizeView";
import StructureView from "./phases/StructureView";
import ContributeView from "./phases/ContributeView";

export default function CanvasFacilitator({ roomCode }: { roomCode: string }) {
  const state = useCanvas(roomCode);
  const [token, setToken] = useState<string | null>(null);
  const [facilitatorParticipantId, setFacilitatorParticipantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);

  useEffect(() => {
    if (state.canvas) {
      setToken(getFacilitatorToken(state.canvas.id));
      setFacilitatorParticipantId(getFacilitatorParticipantId(state.canvas.id));
    }
  }, [state.canvas]);

  // Self-heal: if we hold the facilitator token but don't have a cached
  // facilitator_participant_id (older canvases, fresh browser, etc),
  // look up or create one and cache it.
  useEffect(() => {
    if (!state.canvas || !token || facilitatorParticipantId) return;
    const canvasId = state.canvas.id;
    let cancelled = false;
    ensureFacilitatorParticipant(canvasId)
      .then((id) => {
        if (cancelled) return;
        saveFacilitatorParticipantId(canvasId, id);
        setFacilitatorParticipantId(id);
      })
      .catch((e) => console.error("ensureFacilitatorParticipant failed", e));
    return () => {
      cancelled = true;
    };
  }, [state.canvas, token, facilitatorParticipantId]);

  if (state.loading) {
    return (
      <main className="flex-1 flex items-center justify-center text-grey-700">
        ⏳ Loading…
      </main>
    );
  }

  if (state.error || !state.canvas) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">🤔 Canvas not found</h1>
          <p className="mt-2 text-grey-800">Check the room code and try again.</p>
        </div>
      </main>
    );
  }

  const isFacilitator = !!token;

  // -----------------------------------------------------------------------
  // Phase transition handlers
  // -----------------------------------------------------------------------

  async function startElicit() {
    if (!state.canvas || !token) return;
    if (!window.confirm("Start elicitation? Participants will be asked to list lifecycle stages.")) return;
    setBusy(true);
    try {
      await advancePhase({ canvasId: state.canvas.id, facilitatorToken: token, to: "elicit" });
    } finally {
      setBusy(false);
    }
  }

  async function closeElicit() {
    if (!state.canvas || !token) return;
    if (state.submissions.length === 0) {
      window.alert("No submissions yet — wait for at least one participant to submit, or start from scratch.");
      return;
    }
    if (!window.confirm("Close submissions and synthesize? The AI will propose a unified lifecycle.")) return;
    setSynthesizing(true);
    setSynthError(null);
    const r = await runSynthesis({ canvasId: state.canvas.id, facilitatorToken: token });
    if (!r.ok) setSynthError(r.error ?? "Synthesis failed");
    setSynthesizing(false);
  }

  async function acceptSynthesis() {
    if (!state.canvas || !token || !state.canvas.synthesis_result) return;
    setBusy(true);
    try {
      const labels = state.canvas.synthesis_result.stages.map((s) => s.label);
      await seedStructure({
        canvasId: state.canvas.id,
        facilitatorToken: token,
        columnLabels: labels,
      });
    } catch (e) {
      window.alert(`Couldn't seed structure: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  async function startFromScratch() {
    if (!state.canvas || !token) return;
    if (!window.confirm("Skip the synthesis and use the default lifecycle stages?")) return;
    setBusy(true);
    try {
      await seedDefaultStructure({ canvasId: state.canvas.id, facilitatorToken: token });
    } finally {
      setBusy(false);
    }
  }

  async function setPhase(to: Phase) {
    if (!state.canvas || !token) return;
    await advancePhase({ canvasId: state.canvas.id, facilitatorToken: token, to });
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!isFacilitator) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold">🎤 Facilitator view</h1>
          <p className="mt-2 text-grey-800">
            You&apos;re viewing the facilitator screen for room{" "}
            <span className="font-mono">{roomCode}</span> in read-only mode. To participate, open{" "}
            <a className="underline" href={`/join/${roomCode}`}>/join/{roomCode}</a> on your phone.
          </p>
        </div>
      </main>
    );
  }

  const phase = state.canvas.phase;

  return (
    <main className="flex-1 flex flex-col">
      {phase === "lobby" ? (
        <LobbyView state={state} onStart={startElicit} starting={busy} />
      ) : phase === "elicit" ? (
        <ElicitView
          state={state}
          onClose={closeElicit}
          synthesizing={synthesizing}
          synthError={synthError}
        />
      ) : phase === "synthesize" ? (
        <SynthesizeView
          state={state}
          onAccept={acceptSynthesis}
          onStartFromScratch={startFromScratch}
          busy={busy}
        />
      ) : phase === "structure" ? (
        <StructureView
          state={state}
          token={token!}
          onOpen={() => setPhase("contribute")}
        />
      ) : (
        <ContributeView
          state={state}
          token={token!}
          facilitatorParticipantId={facilitatorParticipantId}
          onEdit={() => setPhase("structure")}
        />
      )}
    </main>
  );
}
