"use client";

import { useEffect, useState } from "react";
import { useCanvas } from "@/lib/useCanvas";
import { getParticipantId, saveParticipantId } from "@/lib/storage";
import { joinCanvas } from "@/lib/actions";
import type { CanvasParticipantRow } from "@/lib/types";
import ParticipantLobby from "./views/ParticipantLobby";
import ParticipantElicit from "./views/ParticipantElicit";
import ParticipantSynthesize from "./views/ParticipantSynthesize";
import ParticipantStructure from "./views/ParticipantStructure";
import ParticipantContribute from "./views/ParticipantContribute";
import ContributeView from "@/app/canvas/[code]/phases/ContributeView";
import { useIsTabletPlus } from "@/lib/useMediaQuery";

export default function JoinClient({ roomCode }: { roomCode: string }) {
  const state = useCanvas(roomCode);
  const isTabletPlus = useIsTabletPlus();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.canvas && !participantId) {
      const stored = getParticipantId(state.canvas.id);
      if (stored && state.participants.some((p) => p.id === stored)) {
        setParticipantId(stored);
      }
    }
  }, [state.canvas, state.participants, participantId]);

  if (state.loading) {
    return <main className="flex-1 flex items-center justify-center text-grey-700">⏳ Loading…</main>;
  }
  if (state.error || !state.canvas) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">🤔 Canvas not found</h1>
          <p className="mt-2 text-grey-800">Check the room code with your facilitator.</p>
        </div>
      </main>
    );
  }

  if (!participantId) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-grey-100">
        <form
          className="w-full max-w-sm space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n || !state.canvas) return;
            setJoining(true);
            setError(null);
            try {
              const row: CanvasParticipantRow = await joinCanvas({
                canvasId: state.canvas.id,
                name: n,
              });
              saveParticipantId(state.canvas.id, row.id);
              setParticipantId(row.id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn't join");
            } finally {
              setJoining(false);
            }
          }}
        >
          <div className="text-center mb-8">
            <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700">🚪 Join canvas</p>
            <p className="text-[48px] font-bold tracking-tight text-foreground leading-none mt-2">{roomCode}</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-2 text-foreground">👤 Your first name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ed"
              className="w-full h-[42px] rounded-[4px] border border-border px-[14px] text-base bg-white focus:outline-none focus:border-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || joining}
            className="w-full h-[44px] rounded-[4px] bg-deep-blue-800 text-white text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-40"
          >
            {joining ? "⏳ Joining…" : "👋 Join →"}
          </button>

          {error ? <p className="text-xs text-[var(--error-fg)] text-center">{error}</p> : null}
        </form>
      </main>
    );
  }

  const phase = state.canvas.phase;
  if (phase === "lobby") return <ParticipantLobby state={state} participantId={participantId} />;
  if (phase === "elicit") return <ParticipantElicit state={state} participantId={participantId} />;
  if (phase === "synthesize") return <ParticipantSynthesize state={state} participantId={participantId} />;
  if (phase === "structure") return <ParticipantStructure state={state} />;

  // Contribute phase: on tablet+, use the full grid view (same as facilitator
  // but with reduced controls); on mobile, the column-tab layout.
  if (isTabletPlus) {
    return (
      <ContributeView
        state={state}
        currentParticipantId={participantId}
        mode="participant"
      />
    );
  }
  return <ParticipantContribute state={state} participantId={participantId} />;
}
