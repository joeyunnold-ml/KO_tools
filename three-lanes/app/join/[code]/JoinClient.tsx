"use client";

import { useEffect, useState } from "react";
import { useLanes } from "@/lib/useLanes";
import { getParticipantId, saveParticipantId } from "@/lib/storage";
import { joinLanes } from "@/lib/actions";
import type { LaneParticipantRow, Team } from "@/lib/types";
import ParticipantLobby from "./views/ParticipantLobby";
import ParticipantCapture from "./views/ParticipantCapture";
import ParticipantSort from "./views/ParticipantSort";
import ParticipantAnalyze from "./views/ParticipantAnalyze";
import ParticipantResults from "./views/ParticipantResults";

export default function JoinClient({ roomCode }: { roomCode: string }) {
  const state = useLanes(roomCode);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState<Team | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.session && !participantId) {
      const stored = getParticipantId(state.session.id);
      if (stored && state.participants.some((p) => p.id === stored)) {
        setParticipantId(stored);
      }
    }
  }, [state.session, state.participants, participantId]);

  if (state.loading) {
    return <main className="flex-1 flex items-center justify-center text-grey-700">⏳ Loading…</main>;
  }
  if (state.error || !state.session) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">🤔 Session not found</h1>
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
            if (!n || !team || !state.session) return;
            setJoining(true);
            setError(null);
            try {
              const row: LaneParticipantRow = await joinLanes({
                sessionId: state.session.id,
                name: n,
                team,
              });
              saveParticipantId(state.session.id, row.id);
              setParticipantId(row.id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn't join");
            } finally {
              setJoining(false);
            }
          }}
        >
          <div className="text-center mb-8">
            <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700">🚪 Join</p>
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

          <div>
            <label className="block text-[13px] font-medium mb-2 text-foreground">🏷️ Your team</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTeam("monstarlab")}
                className={`h-[44px] rounded-[4px] border-2 text-sm font-medium transition-colors ${
                  team === "monstarlab"
                    ? "bg-yellow-500 border-foreground text-foreground"
                    : "border-border bg-white text-grey-800"
                }`}
              >
                🟡 Monstarlab
              </button>
              <button
                type="button"
                onClick={() => setTeam("avis")}
                className={`h-[44px] rounded-[4px] border-2 text-sm font-medium transition-colors ${
                  team === "avis"
                    ? "border-foreground text-white"
                    : "border-border bg-white text-grey-800"
                }`}
                style={team === "avis" ? { backgroundColor: "#D23C68" } : undefined}
              >
                🔴 Avis
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || !team || joining}
            className="w-full h-[44px] rounded-[4px] bg-deep-blue-800 text-white text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-40"
          >
            {joining ? "⏳ Joining…" : "👋 Join →"}
          </button>
          {error ? <p className="text-xs text-[var(--error-fg)] text-center">{error}</p> : null}
        </form>
      </main>
    );
  }

  const phase = state.session.phase;
  if (phase === "setup" || phase === "lobby") {
    return <ParticipantLobby state={state} participantId={participantId} />;
  }
  if (phase === "capture") {
    return <ParticipantCapture state={state} participantId={participantId} />;
  }
  if (phase === "sort") {
    return <ParticipantSort state={state} participantId={participantId} />;
  }
  if (phase === "analyze") {
    return <ParticipantAnalyze />;
  }
  return <ParticipantResults state={state} participantId={participantId} />;
}
