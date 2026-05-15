"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import type { SessionState } from "@/lib/useSession";
import type { QuestionRow } from "@/lib/types";
import { pillColorForParticipant } from "@/lib/palette";
import {
  createQuestion,
  deleteQuestion,
  reorderQuestion,
  updateQuestion,
} from "@/lib/actions";

export default function LobbyView({
  state,
  onAdvance,
  advancing,
}: {
  state: SessionState;
  onAdvance: () => void;
  advancing: boolean;
}) {
  if (!state.session) return null;
  const code = state.session.room_code;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join/${code}`;
  const participants = state.participants;
  const enoughJoined = participants.length >= 2;
  const questions = [...state.questions].sort((a, b) => a.sort_order - b.sort_order);
  const canStart = enoughJoined && questions.length >= 1;

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 p-8 lg:p-10 bg-white overflow-y-auto">
      {/* Left: questions editor + join CTA */}
      <div className="min-w-0">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
          ✏️ Prompts for this session
        </p>
        <h1 className="text-[28px] font-medium text-foreground mb-1">
          {questions.length === 1 ? "Set your prompt" : `Set your ${questions.length} prompts`}
        </h1>
        <p className="text-[14px] text-grey-700 mb-6">
          Edit the default prompt or add more. Participants will answer each one in turn.
        </p>

        <QuestionEditor sessionId={state.session.id} questions={questions} />

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-[22px] font-medium text-foreground mb-3">
            👥 {participants.length} participant{participants.length === 1 ? "" : "s"} joined
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => {
              const pill = pillColorForParticipant(p.id);
              return (
                <span
                  key={p.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-[14px] font-medium"
                  style={{ backgroundColor: pill.bg, color: pill.fg }}
                >
                  {p.name}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex justify-end items-center gap-4 flex-wrap">
          {!enoughJoined ? (
            <p className="text-base text-grey-700">⏳ Waiting for at least 2 participants…</p>
          ) : null}
          {questions.length === 0 ? (
            <p className="text-base text-grey-700">Add at least one prompt above.</p>
          ) : null}
          <button
            onClick={onAdvance}
            disabled={!canStart || advancing}
            className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40 transition-colors"
          >
            {advancing ? "⏳ Starting…" : "▶️ Begin submissions →"}
          </button>
        </div>
      </div>

      {/* Right: join code + QR */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-[8px] border border-border bg-grey-100 p-5">
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            🔑 Join code
          </p>
          <p className="text-[72px] font-bold tracking-tight text-foreground leading-none">
            {code}
          </p>
          <p className="mt-3 text-[14px] text-grey-800 break-all">
            📱 {origin.replace(/^https?:\/\//, "")}/join/{code}
          </p>
          <div className="mt-4 bg-white p-3 rounded-[6px] inline-block border border-border">
            <QRCodeSVG value={joinUrl} size={200} level="M" fgColor="#000F1E" />
          </div>
        </div>
      </aside>
    </div>
  );
}

function QuestionEditor({
  sessionId,
  questions,
}: {
  sessionId: string;
  questions: QuestionRow[];
}) {
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = newText.trim();
    if (!t) return;
    setAdding(true);
    try {
      await createQuestion({ sessionId, text: t, sortOrder: questions.length });
      setNewText("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {questions.map((q, i) => (
          <QuestionRow
            key={q.id}
            question={q}
            index={i}
            total={questions.length}
            onMoveUp={async () => {
              if (i === 0) return;
              const prev = questions[i - 1];
              await Promise.all([
                reorderQuestion({ id: q.id, sortOrder: prev.sort_order }),
                reorderQuestion({ id: prev.id, sortOrder: q.sort_order }),
              ]);
            }}
            onMoveDown={async () => {
              if (i === questions.length - 1) return;
              const next = questions[i + 1];
              await Promise.all([
                reorderQuestion({ id: q.id, sortOrder: next.sort_order }),
                reorderQuestion({ id: next.id, sortOrder: q.sort_order }),
              ]);
            }}
          />
        ))}
      </AnimatePresence>

      <form
        onSubmit={handleAdd}
        className="rounded-[6px] border-2 border-dashed border-grey-300 p-3 bg-grey-100 flex gap-2"
      >
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder='+ Add a prompt (e.g., "What would success look like in 90 days?")'
          className="flex-1 rounded-[4px] border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={!newText.trim() || adding}
          className="h-[38px] rounded-[4px] bg-yellow-500 text-foreground px-4 text-sm font-medium hover:bg-yellow-600 disabled:opacity-40"
        >
          ➕ Add
        </button>
      </form>
    </div>
  );
}

function QuestionRow({
  question,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  question: QuestionRow;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.text);

  async function save() {
    setEditing(false);
    if (text.trim() && text !== question.text) {
      await updateQuestion({ id: question.id, text: text.trim() });
    } else {
      setText(question.text);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete prompt: "${question.text}"?`)) return;
    await deleteQuestion(question.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-[6px] border border-border bg-white p-3 flex items-start gap-3"
    >
      <div className="flex flex-col gap-0 pt-0.5">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="text-grey-600 hover:text-foreground text-xs leading-none disabled:opacity-30"
          aria-label="Move up"
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="text-grey-600 hover:text-foreground text-xs leading-none disabled:opacity-30"
          aria-label="Move down"
        >
          ▼
        </button>
      </div>
      <span className="text-sm font-medium text-grey-500 tabular-nums w-6 pt-0.5">
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              if (e.key === "Escape") {
                setEditing(false);
                setText(question.text);
              }
            }}
            rows={2}
            className="w-full rounded-[4px] border border-foreground px-2 py-1 text-sm focus:outline-none resize-none"
          />
        ) : (
          <p
            onClick={() => setEditing(true)}
            className="text-[14px] text-foreground cursor-text leading-snug"
          >
            {question.text}
          </p>
        )}
      </div>
      {!editing ? (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-grey-700 hover:text-foreground px-1"
            aria-label="Edit"
          >
            ✏️
          </button>
          <button
            onClick={remove}
            className="text-xs text-grey-700 hover:text-[var(--error-fg)] px-1"
            aria-label="Delete"
          >
            ✕
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}
