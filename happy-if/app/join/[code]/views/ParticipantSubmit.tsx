"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import { deleteResponse, submitResponse, updateResponse } from "@/lib/actions";

const MAX_PER_QUESTION = 3;
const MAX_LENGTH = 280;

export default function ParticipantSubmit({
  state,
  participantId,
}: {
  state: SessionState;
  participantId: string;
}) {
  const questions = useMemo(
    () => [...state.questions].sort((a, b) => a.sort_order - b.sort_order),
    [state.questions],
  );

  // Wizard index — first unanswered question, else first
  const myCountByQ = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of state.responses) {
      if (r.participant_id === participantId && r.question_id) {
        m.set(r.question_id, (m.get(r.question_id) ?? 0) + 1);
      }
    }
    return m;
  }, [state.responses, participantId]);

  const firstUnansweredIdx = questions.findIndex((q) => (myCountByQ.get(q.id) ?? 0) === 0);
  const [idx, setIdx] = useState(firstUnansweredIdx === -1 ? 0 : firstUnansweredIdx);

  useEffect(() => {
    if (idx >= questions.length) setIdx(Math.max(0, questions.length - 1));
  }, [questions.length, idx]);

  const totalSubmittedFully = state.participants.filter((p) => {
    const myQs = new Set(
      state.responses.filter((r) => r.participant_id === p.id).map((r) => r.question_id),
    );
    return questions.every((q) => myQs.has(q.id));
  }).length;

  if (questions.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center bg-grey-100">
        <p className="text-grey-700">No prompts yet. Wait for the facilitator…</p>
      </main>
    );
  }

  const activeQ = questions[idx];
  if (!activeQ) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center bg-grey-100">
        <p className="text-grey-700">Loading…</p>
      </main>
    );
  }

  const myForActive = state.responses
    .filter((r) => r.participant_id === participantId && r.question_id === activeQ.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <main className="flex-1 flex flex-col p-5 bg-grey-100">
      <div className="max-w-md mx-auto w-full">
        {/* Wizard nav */}
        {questions.length > 1 ? (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="text-sm text-grey-700 hover:text-foreground disabled:opacity-30"
            >
              ← Prev
            </button>
            <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700">
              Prompt {idx + 1} of {questions.length}
            </p>
            <button
              onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
              disabled={idx === questions.length - 1}
              className="text-sm text-grey-700 hover:text-foreground disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        ) : (
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            💭 Prompt
          </p>
        )}

        {/* Pip indicator (only multi-question) */}
        {questions.length > 1 ? (
          <div className="flex gap-1.5 mb-4 justify-center">
            {questions.map((q, i) => {
              const answered = (myCountByQ.get(q.id) ?? 0) > 0;
              return (
                <button
                  key={q.id}
                  onClick={() => setIdx(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === idx
                      ? "bg-deep-blue-800"
                      : answered
                        ? "bg-deep-blue-800/40"
                        : "bg-grey-300"
                  }`}
                  aria-label={`Go to prompt ${i + 1}`}
                />
              );
            })}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeQ.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            <h1 className="text-[20px] font-medium leading-snug text-foreground mb-6">
              ✍️ {activeQ.text}
            </h1>

            <SubmitForm
              sessionId={state.session!.id}
              questionId={activeQ.id}
              participantId={participantId}
              currentCount={myForActive.length}
            />

            <div className="mt-6 mb-4">
              <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
                📝 Your responses for this prompt
              </p>
              {myForActive.length === 0 ? (
                <p className="text-sm text-grey-600">📭 Nothing submitted yet.</p>
              ) : (
                <ul className="space-y-2">
                  {myForActive.map((r, i) => (
                    <MyResponseRow key={r.id} index={i} text={r.text} responseId={r.id} />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="text-xs text-grey-600 text-center mt-6">
          📊 {totalSubmittedFully} of {state.participants.length} have answered every prompt
        </p>
      </div>
    </main>
  );
}

function SubmitForm({
  sessionId,
  questionId,
  participantId,
  currentCount,
}: {
  sessionId: string;
  questionId: string;
  participantId: string;
  currentCount: number;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_PER_QUESTION - currentCount;

  // Reset text when question changes
  useEffect(() => {
    setText("");
    setError(null);
  }, [questionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitResponse({ sessionId, questionId, participantId, text: trimmed });
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (remaining <= 0) {
    return (
      <p className="rounded-[4px] bg-white border border-border px-4 py-3 text-xs text-grey-800">
        ✅ You&apos;ve used all {MAX_PER_QUESTION} submissions for this prompt. You can still edit or delete them below.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
        placeholder="Type a response…"
        rows={4}
        className="w-full rounded-[4px] border border-border px-[14px] py-3 text-base bg-white focus:outline-none focus:border-foreground resize-none"
      />
      <div className="flex items-center justify-between text-xs text-grey-700">
        <span>{MAX_LENGTH - text.length} chars remaining</span>
        <span>
          {remaining} of {MAX_PER_QUESTION} left
        </span>
      </div>
      <button
        type="submit"
        disabled={!text.trim() || submitting}
        className="w-full h-[44px] rounded-[4px] bg-deep-blue-800 text-white text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-40"
      >
        {submitting ? "⏳ Submitting…" : "📤 Submit →"}
      </button>
      {error ? <p className="text-xs text-[var(--error-fg)]">{error}</p> : null}
    </form>
  );
}

function MyResponseRow({ index, text, responseId }: { index: number; text: string; responseId: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await updateResponse({ id: responseId, text: draft.trim() });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this response?")) return;
    setBusy(true);
    try {
      await deleteResponse(responseId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-[8px] bg-white border border-border p-4">
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 280))}
            rows={3}
            className="w-full rounded-[4px] border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setEditing(false);
                setDraft(text);
              }}
              className="h-8 px-3 text-xs rounded-[4px] text-grey-800"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="h-8 px-3 text-xs rounded-[4px] bg-deep-blue-800 text-white font-medium"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground">
            {index + 1}. &ldquo;{text}&rdquo;
          </p>
          <div className="mt-2 flex gap-4 text-xs">
            <button onClick={() => setEditing(true)} className="text-grey-700 hover:text-foreground">
              ✏️ edit
            </button>
            <button onClick={remove} disabled={busy} className="text-grey-700 hover:text-[var(--error-fg)]">
              🗑️ delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}
