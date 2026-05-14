"use client";

import { useState } from "react";
import type { SessionState } from "@/lib/useSession";
import { deleteResponse, submitResponse, updateResponse } from "@/lib/actions";

const MAX_PER_PARTICIPANT = 3;
const MAX_LENGTH = 280;

export default function ParticipantSubmit({
  state,
  participantId,
}: {
  state: SessionState;
  participantId: string;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine = state.responses.filter((r) => r.participant_id === participantId);
  const remaining = MAX_PER_PARTICIPANT - mine.length;
  const totalSubmittedParticipants = new Set(state.responses.map((r) => r.participant_id)).size;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !state.session) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitResponse({
        sessionId: state.session.id,
        participantId,
        text: trimmed,
      });
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col p-5 bg-grey-100">
      <div className="max-w-md mx-auto w-full">
        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">💭 Prompt</p>
        <h1 className="text-[22px] font-medium leading-snug text-foreground mb-6">
          ✍️ &ldquo;I&apos;ll consider this engagement a success if ___&rdquo;
        </h1>

        {remaining > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-3 mb-6">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="…we recover the booking conversion rate by September."
              rows={4}
              className="w-full rounded-[4px] border border-border px-[14px] py-3 text-base bg-white focus:outline-none focus:border-foreground resize-none"
            />
            <div className="flex items-center justify-between text-xs text-grey-700">
              <span>{MAX_LENGTH - text.length} chars remaining</span>
              <span>{remaining} of {MAX_PER_PARTICIPANT} left</span>
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
        ) : (
          <p className="rounded-[4px] bg-white border border-border px-4 py-3 text-xs text-grey-800 mb-6">
            ✅ You&apos;ve used all 3 submissions. You can still edit or delete them below.
          </p>
        )}

        <div className="mb-6">
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">📝 Your responses</p>
          {mine.length === 0 ? (
            <p className="text-sm text-grey-600">📭 Nothing submitted yet.</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((r, i) => (
                <MyResponseRow key={r.id} index={i} text={r.text} responseId={r.id} />
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-grey-600 text-center">
          📊 {totalSubmittedParticipants} of {state.participants.length} participants have submitted
        </p>
      </div>
    </main>
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
    try { await deleteResponse(responseId); } finally { setBusy(false); }
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
            <button onClick={() => { setEditing(false); setDraft(text); }} className="h-8 px-3 text-xs rounded-[4px] text-grey-800">
              Cancel
            </button>
            <button onClick={save} disabled={busy} className="h-8 px-3 text-xs rounded-[4px] bg-deep-blue-800 text-white font-medium">
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground">{index + 1}. &ldquo;{text}&rdquo;</p>
          <div className="mt-2 flex gap-4 text-xs">
            <button onClick={() => setEditing(true)} className="text-grey-700 hover:text-foreground">✏️ edit</button>
            <button onClick={remove} disabled={busy} className="text-grey-700 hover:text-[var(--error-fg)]">🗑️ delete</button>
          </div>
        </>
      )}
    </li>
  );
}
