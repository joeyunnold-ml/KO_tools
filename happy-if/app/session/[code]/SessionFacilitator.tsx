"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useSession } from "@/lib/useSession";
import { getFacilitatorToken } from "@/lib/storage";
import { advancePhase, autoCluster } from "@/lib/actions";
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

  // Per-question auto-cluster state
  const [autoClusteringIds, setAutoClusteringIds] = useState<Set<string>>(new Set());
  const [autoClusterErrors, setAutoClusterErrors] = useState<Map<string, string>>(new Map());
  const autoClusterAttempted = useRef<Set<string>>(new Set());

  // Active cluster tab — which question is showing
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const questions = useMemo(
    () => [...state.questions].sort((a, b) => a.sort_order - b.sort_order),
    [state.questions],
  );

  useEffect(() => {
    if (state.session) setToken(getFacilitatorToken(state.session.id));
  }, [state.session]);

  // Default active tab once questions load
  useEffect(() => {
    if (!activeQuestionId && questions.length > 0) {
      setActiveQuestionId(questions[0].id);
    }
  }, [activeQuestionId, questions]);

  // Auto-cluster every question in parallel when entering cluster phase.
  useEffect(() => {
    if (!state.session || !token) return;
    if (state.session.phase !== "cluster") return;
    for (const q of questions) {
      if (autoClusterAttempted.current.has(q.id)) continue;
      const hasGroups = state.groups.some((g) => g.question_id === q.id);
      if (hasGroups) continue;
      const hasResponses = state.responses.some((r) => r.question_id === q.id);
      if (!hasResponses) continue;
      autoClusterAttempted.current.add(q.id);
      setAutoClusteringIds((prev) => {
        const next = new Set(prev);
        next.add(q.id);
        return next;
      });
      autoCluster({
        sessionId: state.session.id,
        questionId: q.id,
        facilitatorToken: token,
      })
        .then((r) => {
          if (!r.ok) {
            setAutoClusterErrors((prev) => {
              const next = new Map(prev);
              next.set(q.id, r.error ?? "Auto-clustering failed");
              return next;
            });
          }
        })
        .finally(() => {
          setAutoClusteringIds((prev) => {
            const next = new Set(prev);
            next.delete(q.id);
            return next;
          });
        });
    }
  }, [state.session, token, questions, state.groups, state.responses]);

  async function handleReCluster(questionId: string) {
    if (!state.session || !token) return;
    if (!window.confirm("Re-cluster this prompt's responses? This deletes the current groups and asks the AI to redo them.")) return;
    setAutoClusteringIds((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
    setAutoClusterErrors((prev) => {
      const next = new Map(prev);
      next.delete(questionId);
      return next;
    });
    const r = await autoCluster({
      sessionId: state.session.id,
      questionId,
      facilitatorToken: token,
      force: true,
    });
    if (!r.ok) {
      setAutoClusterErrors((prev) => {
        const next = new Map(prev);
        next.set(questionId, r.error ?? "Re-clustering failed");
        return next;
      });
    }
    setAutoClusteringIds((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }

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
    const confirmed = window.confirm(`Move to ${phaseLabels[next]}? This can't be undone.`);
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

  const activeQ = questions.find((q) => q.id === activeQuestionId) ?? questions[0] ?? null;

  return (
    <main className="flex-1 flex flex-col">
      {phase === "lobby" ? (
        <LobbyView state={state} onAdvance={handleAdvance} advancing={advancing} />
      ) : phase === "submit" ? (
        <SubmitView state={state} onAdvance={handleAdvance} advancing={advancing} buttonLabel={PHASE_BUTTON_LABEL[phase]} />
      ) : phase === "cluster" && activeQ ? (
        <>
          {questions.length > 1 ? (
            <QuestionTabs
              questions={questions}
              activeId={activeQ.id}
              setActiveId={setActiveQuestionId}
              state={state}
              autoClusteringIds={autoClusteringIds}
            />
          ) : null}
          <ClusterView
            state={state}
            questionId={activeQ.id}
            onAdvance={handleAdvance}
            advancing={advancing}
            buttonLabel={PHASE_BUTTON_LABEL[phase]}
            autoClustering={autoClusteringIds.has(activeQ.id)}
            autoClusterError={autoClusterErrors.get(activeQ.id) ?? null}
            onReCluster={() => handleReCluster(activeQ.id)}
          />
        </>
      ) : phase === "vote" ? (
        <VoteView state={state} onAdvance={handleAdvance} advancing={advancing} buttonLabel={PHASE_BUTTON_LABEL[phase]} />
      ) : (
        <ResultsView state={state} />
      )}
    </main>
  );
}

function QuestionTabs({
  questions,
  activeId,
  setActiveId,
  state,
  autoClusteringIds,
}: {
  questions: Array<{ id: string; text: string }>;
  activeId: string;
  setActiveId: (id: string) => void;
  state: ReturnType<typeof useSession>;
  autoClusteringIds: Set<string>;
}) {
  return (
    <div className="flex items-center gap-1 px-6 pt-3 border-b border-border bg-white overflow-x-auto">
      {questions.map((q, i) => {
        const active = q.id === activeId;
        const clustering = autoClusteringIds.has(q.id);
        const groupCount = state.groups.filter((g) => g.question_id === q.id).length;
        return (
          <button
            key={q.id}
            onClick={() => setActiveId(q.id)}
            className={`relative px-3 py-2 text-[13px] font-medium transition-colors flex-shrink-0 max-w-[260px] truncate ${
              active ? "text-foreground" : "text-grey-700 hover:text-foreground"
            }`}
            title={q.text}
          >
            <span className="text-grey-500 mr-1">{i + 1}.</span>
            <span>{q.text}</span>
            <span className="ml-2 text-grey-500 text-[11px]">
              {clustering ? "🤖" : groupCount > 0 ? `(${groupCount})` : ""}
            </span>
            {active ? (
              <motion.span
                layoutId="cluster-tab-underline"
                className="absolute left-0 right-0 -bottom-px h-[2px] bg-foreground"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
