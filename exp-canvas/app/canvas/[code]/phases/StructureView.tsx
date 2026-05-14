"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CanvasState } from "@/lib/useCanvas";
import type { CanvasColumnRow, CanvasRowRow, RowColorKey } from "@/lib/types";
import { ROW_COLOR_KEYS, rowColor } from "@/lib/palette";
import {
  createColumn,
  createRow,
  deleteColumn,
  deleteRow,
  renameColumn,
  renameRow,
  reorderColumn,
  reorderRow,
  setRowColor,
} from "@/lib/actions";

export default function StructureView({
  state,
  token,
  onOpen,
}: {
  state: CanvasState;
  token: string;
  onOpen: () => void;
}) {
  void token; // token is checked server-side via facilitator_token already
  const [newColLabel, setNewColLabel] = useState("");
  const [newRowLabel, setNewRowLabel] = useState("");
  const [busy, setBusy] = useState(false);

  if (!state.canvas) return null;

  const columns = [...state.columns].sort((a, b) => a.sort_order - b.sort_order);
  const rows = [...state.rows].sort((a, b) => a.sort_order - b.sort_order);

  async function handleAddCol(e: React.FormEvent) {
    e.preventDefault();
    if (!state.canvas) return;
    const label = newColLabel.trim();
    if (!label) return;
    setBusy(true);
    try {
      await createColumn({
        canvasId: state.canvas.id,
        label,
        sortOrder: columns.length,
      });
      setNewColLabel("");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddRow(e: React.FormEvent) {
    e.preventDefault();
    if (!state.canvas) return;
    const label = newRowLabel.trim();
    if (!label) return;
    setBusy(true);
    try {
      await createRow({
        canvasId: state.canvas.id,
        label,
        color: ROW_COLOR_KEYS[rows.length % ROW_COLOR_KEYS.length],
        sortOrder: rows.length,
      });
      setNewRowLabel("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 bg-white overflow-y-auto">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
            🛠️ Structure mode
          </p>
          <h1 className="text-[28px] font-medium text-foreground">
            Edit the canvas framework
          </h1>
          <p className="text-[14px] text-grey-700 mt-1">
            Contributions are paused while you edit. Open the canvas when you&apos;re ready.
          </p>
        </div>
        <button
          onClick={onOpen}
          disabled={columns.length === 0 || rows.length === 0}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-8 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40"
        >
          📂 Open for contributions →
        </button>
      </div>

      {/* Columns */}
      <section className="mb-10">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
          📊 Stages (columns)
        </p>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {columns.map((c, i) => (
              <ColumnChip
                key={c.id}
                column={c}
                index={i}
                total={columns.length}
                onMoveLeft={async () => {
                  if (i === 0) return;
                  const prev = columns[i - 1];
                  await Promise.all([
                    reorderColumn({ id: c.id, sortOrder: prev.sort_order }),
                    reorderColumn({ id: prev.id, sortOrder: c.sort_order }),
                  ]);
                }}
                onMoveRight={async () => {
                  if (i === columns.length - 1) return;
                  const next = columns[i + 1];
                  await Promise.all([
                    reorderColumn({ id: c.id, sortOrder: next.sort_order }),
                    reorderColumn({ id: next.id, sortOrder: c.sort_order }),
                  ]);
                }}
              />
            ))}
          </AnimatePresence>
          <form onSubmit={handleAddCol} className="flex gap-2 items-center">
            <input
              value={newColLabel}
              onChange={(e) => setNewColLabel(e.target.value)}
              placeholder="+ Stage"
              className="h-[40px] rounded-[4px] border border-border px-3 bg-white text-sm focus:outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={!newColLabel.trim() || busy}
              className="h-[40px] rounded-[4px] bg-yellow-500 text-foreground px-4 text-sm font-medium hover:bg-yellow-600 disabled:opacity-40"
            >
              ➕ Add
            </button>
          </form>
        </div>
      </section>

      {/* Rows */}
      <section>
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
          📋 Dimensions (rows)
        </p>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {rows.map((r, i) => (
              <RowChip
                key={r.id}
                row={r}
                onMoveUp={async () => {
                  if (i === 0) return;
                  const prev = rows[i - 1];
                  await Promise.all([
                    reorderRow({ id: r.id, sortOrder: prev.sort_order }),
                    reorderRow({ id: prev.id, sortOrder: r.sort_order }),
                  ]);
                }}
                onMoveDown={async () => {
                  if (i === rows.length - 1) return;
                  const next = rows[i + 1];
                  await Promise.all([
                    reorderRow({ id: r.id, sortOrder: next.sort_order }),
                    reorderRow({ id: next.id, sortOrder: r.sort_order }),
                  ]);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
        <form onSubmit={handleAddRow} className="flex gap-2 items-center mt-3">
          <input
            value={newRowLabel}
            onChange={(e) => setNewRowLabel(e.target.value)}
            placeholder="+ Dimension"
            className="h-[40px] rounded-[4px] border border-border px-3 bg-white text-sm focus:outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={!newRowLabel.trim() || busy}
            className="h-[40px] rounded-[4px] bg-yellow-500 text-foreground px-4 text-sm font-medium hover:bg-yellow-600 disabled:opacity-40"
          >
            ➕ Add
          </button>
        </form>
      </section>
    </div>
  );
}

function ColumnChip({
  column,
  index,
  total,
  onMoveLeft,
  onMoveRight,
}: {
  column: CanvasColumnRow;
  index: number;
  total: number;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(column.label);

  async function commit() {
    setEditing(false);
    if (label.trim() && label !== column.label) {
      try { await renameColumn({ id: column.id, label: label.trim() }); } catch (e) { console.error(e); }
    } else {
      setLabel(column.label);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete column "${column.label}"? Any stickies in it will be lost.`)) return;
    try { await deleteColumn(column.id); } catch (e) { console.error(e); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 rounded-[6px] border border-border bg-grey-100 px-2 py-1.5"
    >
      <button
        onClick={onMoveLeft}
        disabled={index === 0}
        className="text-grey-600 hover:text-foreground disabled:opacity-30 px-1"
        aria-label="Move left"
      >
        ◀
      </button>
      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setEditing(false); setLabel(column.label); }
          }}
          className="text-sm font-medium px-1 bg-transparent border-b border-foreground focus:outline-none w-32"
        />
      ) : (
        <span
          className="text-sm font-medium cursor-text px-1"
          onClick={() => setEditing(true)}
        >
          {column.label}
        </span>
      )}
      <button
        onClick={onMoveRight}
        disabled={index === total - 1}
        className="text-grey-600 hover:text-foreground disabled:opacity-30 px-1"
        aria-label="Move right"
      >
        ▶
      </button>
      <button
        onClick={handleDelete}
        className="text-grey-500 hover:text-[var(--error-fg)] px-1"
        aria-label="Delete"
      >
        ✕
      </button>
    </motion.div>
  );
}

function RowChip({
  row,
  onMoveUp,
  onMoveDown,
}: {
  row: CanvasRowRow;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label);
  const color = rowColor(row.color);

  async function commit() {
    setEditing(false);
    if (label.trim() && label !== row.label) {
      try { await renameRow({ id: row.id, label: label.trim() }); } catch (e) { console.error(e); }
    } else {
      setLabel(row.label);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete row "${row.label}"? Any stickies in it will be lost.`)) return;
    try { await deleteRow(row.id); } catch (e) { console.error(e); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="flex items-center gap-2 rounded-[6px] border-2 p-2"
      style={{ backgroundColor: color.bg, borderColor: color.border }}
    >
      <div className="flex flex-col gap-0">
        <button onClick={onMoveUp} className="text-grey-600 hover:text-foreground text-xs leading-none" aria-label="Up">▲</button>
        <button onClick={onMoveDown} className="text-grey-600 hover:text-foreground text-xs leading-none" aria-label="Down">▼</button>
      </div>
      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setEditing(false); setLabel(row.label); }
          }}
          className="text-base font-semibold bg-transparent border-b focus:outline-none flex-1"
          style={{ borderColor: color.text, color: color.text }}
        />
      ) : (
        <span
          className="text-base font-semibold cursor-text flex-1"
          style={{ color: color.text }}
          onClick={() => setEditing(true)}
        >
          {row.label}
        </span>
      )}
      <ColorPicker rowId={row.id} active={row.color} />
      <button
        onClick={handleDelete}
        className="text-grey-500 hover:text-[var(--error-fg)] px-1"
        aria-label="Delete"
      >
        ✕
      </button>
    </motion.div>
  );
}

function ColorPicker({ rowId, active }: { rowId: string; active: RowColorKey }) {
  return (
    <div className="flex gap-1">
      {ROW_COLOR_KEYS.map((k) => {
        const c = rowColor(k);
        return (
          <button
            key={k}
            onClick={() => setRowColor({ id: rowId, color: k })}
            className={`w-5 h-5 rounded-full border-2 ${active === k ? "ring-2 ring-foreground" : ""}`}
            style={{ backgroundColor: c.bg, borderColor: c.border }}
            aria-label={`Color ${k}`}
          />
        );
      })}
    </div>
  );
}
