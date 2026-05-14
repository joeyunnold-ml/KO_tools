"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CanvasState } from "@/lib/useCanvas";
import type { CanvasRowRow, StickyRow } from "@/lib/types";
import { pillColorForParticipant, rowColor } from "@/lib/palette";
import { createSticky, deleteSticky, updateStickyText } from "@/lib/actions";

const MAX_STICKY_LEN = 200;

export default function ParticipantContribute({
  state,
  participantId,
}: {
  state: CanvasState;
  participantId: string;
}) {
  const columns = useMemo(
    () => [...state.columns].sort((a, b) => a.sort_order - b.sort_order),
    [state.columns],
  );
  const rows = useMemo(
    () => [...state.rows].sort((a, b) => a.sort_order - b.sort_order),
    [state.rows],
  );
  const participantsById = useMemo(
    () => new Map(state.participants.map((p) => [p.id, p])),
    [state.participants],
  );

  // Active column id — defaults to first column, auto-syncs with facilitator focus
  const [activeColId, setActiveColId] = useState<string | null>(null);
  const previousFocus = useRef<string | null>(null);

  useEffect(() => {
    if (!state.canvas) return;
    if (activeColId === null && columns.length > 0) {
      setActiveColId(state.canvas.focused_column_id ?? columns[0].id);
    }
  }, [columns, state.canvas, activeColId]);

  // When facilitator focus changes, auto-navigate this participant's tab
  useEffect(() => {
    const focus = state.canvas?.focused_column_id ?? null;
    if (focus && focus !== previousFocus.current && focus !== activeColId) {
      setActiveColId(focus);
    }
    previousFocus.current = focus;
  }, [state.canvas?.focused_column_id, activeColId]);

  const stickiesByCell = useMemo(() => {
    const m = new Map<string, StickyRow[]>();
    for (const s of state.stickies) {
      const k = `${s.column_id}__${s.row_id}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
        return a.created_at.localeCompare(b.created_at);
      });
    }
    return m;
  }, [state.stickies]);

  const activeCol = columns.find((c) => c.id === activeColId) ?? columns[0];
  if (!state.canvas || !activeCol) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-grey-700">
        Waiting for canvas…
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-grey-100">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700">
          🧪 Lifecycle canvas
        </p>
        <p className="text-xs text-grey-700">
          Code <span className="font-mono">{state.canvas.room_code}</span> · 👥 {state.participants.length} joined
        </p>
      </div>

      {/* Column tab bar */}
      <div className="flex overflow-x-auto bg-white border-b border-border px-2 py-1 gap-1">
        {columns.map((c) => {
          const active = c.id === activeCol.id;
          const focused = c.id === state.canvas?.focused_column_id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveColId(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-colors ${
                active
                  ? "bg-deep-blue-800 text-white"
                  : focused
                    ? "bg-yellow-500 text-foreground"
                    : "bg-grey-100 text-grey-800"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Active column sections */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-[22px] font-medium text-foreground mb-4">{activeCol.label}</h2>
        <div className="space-y-5">
          {rows.map((r) => (
            <RowSection
              key={r.id}
              row={r}
              columnId={activeCol.id}
              stickies={stickiesByCell.get(`${activeCol.id}__${r.id}`) ?? []}
              participantId={participantId}
              participantsById={participantsById}
              canvasId={state.canvas!.id}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function RowSection({
  row,
  columnId,
  stickies,
  participantId,
  participantsById,
  canvasId,
}: {
  row: CanvasRowRow;
  columnId: string;
  stickies: StickyRow[];
  participantId: string;
  participantsById: Map<string, { name: string; id: string }>;
  canvasId: string;
}) {
  const color = rowColor(row.color);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      await createSticky({ canvasId, columnId, rowId: row.id, participantId, text });
      setDraft("");
      setAdding(false);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h3 className="text-[14px] font-semibold mb-2" style={{ color: color.text }}>
        {row.label}
      </h3>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {stickies.map((s) => (
            <StickyDisplay
              key={s.id}
              sticky={s}
              isMine={s.participant_id === participantId}
              participantsById={participantsById}
              color={color}
            />
          ))}
        </AnimatePresence>
        {stickies.length === 0 && !adding ? (
          <p className="text-xs text-grey-600 italic">no contributions yet</p>
        ) : null}

        {adding ? (
          <div
            className="rounded-[6px] border-2 p-3"
            style={{ backgroundColor: color.bg, borderColor: color.border }}
          >
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_STICKY_LEN))}
              placeholder={`What about ${row.label.toLowerCase()}?`}
              rows={3}
              className="w-full rounded-[4px] border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-grey-600">{MAX_STICKY_LEN - draft.length} chars left</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setAdding(false); setDraft(""); }}
                  className="h-8 px-3 text-xs rounded-[4px] text-grey-800"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!draft.trim() || busy}
                  className="h-8 px-3 text-xs rounded-[4px] bg-deep-blue-800 text-white font-medium disabled:opacity-40"
                >
                  {busy ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left rounded-[6px] border-2 border-dashed px-3 py-2 text-sm text-grey-700 hover:text-foreground"
            style={{ borderColor: color.border }}
          >
            ➕ Add to {row.label}
          </button>
        )}
      </div>
    </section>
  );
}

function StickyDisplay({
  sticky,
  isMine,
  participantsById,
  color,
}: {
  sticky: StickyRow;
  isMine: boolean;
  participantsById: Map<string, { name: string; id: string }>;
  color: ReturnType<typeof rowColor>;
}) {
  const p = participantsById.get(sticky.participant_id);
  const pill = p ? pillColorForParticipant(p.id) : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sticky.text);
  const [busy, setBusy] = useState(false);

  async function save() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      await updateStickyText({ id: sticky.id, text });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete your sticky?")) return;
    setBusy(true);
    try { await deleteSticky(sticky.id); } finally { setBusy(false); }
  }

  return (
    <motion.div
      layout
      layoutId={`p-sticky-${sticky.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="rounded-[6px] p-3 border-2"
      style={{
        backgroundColor: color.bg,
        borderColor: sticky.highlighted ? "#000F1E" : color.border,
      }}
    >
      {editing ? (
        <>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_STICKY_LEN))}
            rows={3}
            className="w-full rounded-[4px] border border-border px-2 py-1 text-sm bg-white focus:outline-none focus:border-foreground resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setEditing(false); setDraft(sticky.text); }}
              className="h-7 px-2 text-xs rounded-[4px] text-grey-800"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="h-7 px-2 text-xs rounded-[4px] bg-deep-blue-800 text-white font-medium"
            >
              Save
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-foreground leading-snug">{sticky.text}</p>
          <div className="mt-2 flex items-center gap-2">
            {pill ? (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: pill.bg, color: pill.fg }}
              >
                {p?.name}
              </span>
            ) : null}
            {sticky.highlighted ? <span className="text-[11px]">⭐</span> : null}
            {isMine ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="ml-auto text-xs text-grey-700 hover:text-foreground"
                >
                  ✏️ edit
                </button>
                <button
                  onClick={remove}
                  className="text-xs text-grey-700 hover:text-[var(--error-fg)]"
                >
                  🗑 delete
                </button>
              </>
            ) : null}
          </div>
        </>
      )}
    </motion.div>
  );
}
