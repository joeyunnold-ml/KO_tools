"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { getFacilitatorToken } from "@/lib/storage";
import { advancePhase } from "@/lib/actions";
import LobbyView from "./phases/LobbyView";
import SubmitView from "./phases/SubmitView";
import ClusterView from "./phases/ClusterView";
import VoteView from "./phases/VoteView";
import ResultsView from "./phases/ResultsView";
import type { Phase } from "@/lib/types";

const NEXT_PHASE: Record<Phase, Phase | null> = {
  lobby: "submit",
  submit: "cluster",
  cluster: "vote",
  vote: "complete",
  complete: null,
};

const PHASE_BUTTON_LABEL: Record<Phase, string> = {
  lobby: "▶️ Begin submissions →",
  submit: "🔒 Close submissions →",
  cluster: "🗳️ Start voting →",
  vote: "🏁 Close voting →",
  complete: "",
};

export default function SessionFacilitator({ roomCode }: { roomCode: string }) {
  const state = useSession(roomCode);
  const [token, setToken] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (state.session) setToken(getFacilitatorToken(state.session.id));
  }, [state.session]);

  if (state.loading) {
    return (
      <main className="flex-1 flex items-center justify-center text-grey-700">⏳ Loading…</main>
    );
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
  const phase = state.session.phase;
  const next = NEXT_PHASE[phase];

  async function handleAdvance() {
    if (!next || !token || !state.session) return;
    const phaseLabels: Record<Phase, string> = {
      lobby: "lobby",
      submit: "submissions",
      cluster: "clustering",
      vote: "voting",
      complete: "results",
    };
    const confirmed = window.confirm(
      `Move to ${phaseLabels[next]}? This can't be undone.`,
    );
    if (!confirmed) return;
    setAdvancing(true);
    try {
      await advancePhase({ sessionId: state.session.id, facilitatorToken: token, to: next });
    } catch (e) {
      window.alert(`Couldn't advance phase: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setAdvancing(false);
    }
  }

  if (!isFacilitator) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold">🎤 Facilitator view</h1>
          <p className="mt-2 text-grey-800">
            You&apos;re viewing the facilitator screen for room <span className="font-mono">{roomCode}</span> in read-only mode.
            To participate, open <a className="underline" href={`/join/${roomCode}`}>/join/{roomCode}</a> on your phone.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      {phase === "lobby" ? (
        <LobbyView state={state} onAdvance={handleAdvance} advancing={advancing} />
      ) : phase === "submit" ? (
        <SubmitView state={state} onAdvance={handleAdvance} advancing={advancing} buttonLabel={PHASE_BUTTON_LABEL[phase]} />
      ) : phase === "cluster" ? (
        <ClusterView state={state} onAdvance={handleAdvance} advancing={advancing} buttonLabel={PHASE_BUTTON_LABEL[phase]} />
      ) : phase === "vote" ? (
        <VoteView state={state} onAdvance={handleAdvance} advancing={advancing} buttonLabel={PHASE_BUTTON_LABEL[phase]} />
      ) : (
        <ResultsView state={state} />
      )}
    </main>
  );
}
