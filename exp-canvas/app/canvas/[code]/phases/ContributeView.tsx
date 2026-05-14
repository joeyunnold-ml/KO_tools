"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CanvasState } from "@/lib/useCanvas";
import type { CanvasColumnRow, CanvasRowRow, StickyRow } from "@/lib/types";
import { pillColorForParticipant, rowColor } from "@/lib/palette";
import {
  deleteSticky,
  moveSticky,
  setFocusedColumn,
  toggleHighlight,
} from "@/lib/actions";
import { downloadMarkdown } from "@/lib/exportMarkdown";

export default function ContributeView({
  state,
  token,
  onEdit,
}: {
  state: CanvasState;
  token: string;
  onEdit: () => void;
}) {
  if (!state.canvas) return null;

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

  const focusedColumnId = state.canvas.focused_column_id;

  // sticky by cell
  const stickiesByCell = useMemo(() => {
    const m = new Map<string, StickyRow[]>();
    for (const s of state.stickies) {
      const k = `${s.column_id}__${s.row_id}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    // Highlighted stickies sort to the top
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
        return a.created_at.localeCompare(b.created_at);
      });
    }
    return m;
  }, [state.stickies]);

  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [moving, setMoving] = useState<StickyRow | null>(null);

  async function focusColumn(id: string | null) {
    if (!state.canvas) return;
    await setFocusedColumn({
      canvasId: state.canvas.id,
      facilitatorToken: token,
      columnId: id,
    });
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700">
            🧪 Experiment Lifecycle Canvas
          </p>
          <span className="text-sm text-grey-700">
            Code: <span className="font-mono font-medium text-foreground">{state.canvas.room_code}</span>
          </span>
          <span className="text-sm text-grey-700">
            👥 {state.participants.length} joined
          </span>
        </div>
        <div className="flex items-center gap-2">
          {focusedColumnId ? (
            <button
              onClick={() => focusColumn(null)}
              className="h-[36px] rounded-[4px] bg-yellow-500 text-foreground px-4 text-sm font-medium hover:bg-yellow-600"
            >
              🔍 Exit focus
            </button>
          ) : null}
          <button
            onClick={onEdit}
            className="h-[36px] rounded-[4px] bg-white border border-foreground text-foreground px-4 text-sm font-medium hover:bg-grey-100"
          >
            🛠️ Edit structure
          </button>
          <button
            onClick={() => downloadMarkdown(state)}
            className="h-[36px] rounded-[4px] bg-yellow-500 text-foreground px-4 text-sm font-medium hover:bg-yellow-600"
          >
            📥 Export
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-2">
        <div
          className="grid gap-1 min-w-max"
          style={{
            gridTemplateColumns: `160px repeat(${columns.length}, minmax(220px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="bg-white sticky top-0 z-10" />
          {columns.map((c) => {
            const focused = focusedColumnId === c.id;
            const dimmed = focusedColumnId !== null && !focused;
            return (
              <button
                key={c.id}
                onClick={() => focusColumn(focused ? null : c.id)}
                className={`bg-white sticky top-0 z-10 px-3 py-2 text-left border-b-2 transition-opacity ${
                  focused ? "border-foreground" : "border-border"
                } ${dimmed ? "opacity-30" : ""}`}
              >
                <p className="text-[14px] font-semibold text-foreground">{c.label}</p>
              </button>
            );
          })}

          {/* Data rows */}
          {rows.map((r) => {
            const color = rowColor(r.color);
            return (
              <RowFragment
                key={r.id}
                row={r}
                color={color}
                columns={columns}
                focusedColumnId={focusedColumnId}
                stickiesByCell={stickiesByCell}
                participantsById={participantsById}
                onExpand={setExpandedCell}
                onMove={setMoving}
              />
            );
          })}
        </div>
      </div>

      {/* Cell expand overlay */}
      <AnimatePresence>
        {expandedCell ? (
          <CellModal
            cellKey={expandedCell}
            stickies={stickiesByCell.get(expandedCell) ?? []}
            participantsById={participantsById}
            onClose={() => setExpandedCell(null)}
            onMove={(s) => {
              setExpandedCell(null);
              setMoving(s);
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* Move dialog */}
      <AnimatePresence>
        {moving ? (
          <MoveDialog
            sticky={moving}
            columns={columns}
            rows={rows}
            onCancel={() => setMoving(null)}
            onMoveTo={async (colId, rowId) => {
              await moveSticky({ id: moving.id, columnId: colId, rowId });
              setMoving(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function RowFragment({
  row,
  color,
  columns,
  focusedColumnId,
  stickiesByCell,
  participantsById,
  onExpand,
  onMove,
}: {
  row: CanvasRowRow;
  color: ReturnType<typeof rowColor>;
  columns: CanvasColumnRow[];
  focusedColumnId: string | null;
  stickiesByCell: Map<string, StickyRow[]>;
  participantsById: Map<string, { name: string; id: string }>;
  onExpand: (key: string) => void;
  onMove: (s: StickyRow) => void;
}) {
  return (
    <>
      <div
        className="px-3 py-3 border-r border-border flex items-center"
        style={{ backgroundColor: color.bandBg }}
      >
        <span className="text-[14px] font-semibold" style={{ color: color.text }}>
          {row.label}
        </span>
      </div>
      {columns.map((c) => {
        const key = `${c.id}__${row.id}`;
        const cellStickies = stickiesByCell.get(key) ?? [];
        const dimmed = focusedColumnId !== null && focusedColumnId !== c.id;
        return (
          <Cell
            key={key}
            cellKey={key}
            stickies={cellStickies}
            color={color}
            dimmed={dimmed}
            participantsById={participantsById}
            onExpand={() => onExpand(key)}
            onMove={onMove}
          />
        );
      })}
    </>
  );
}

function Cell({
  cellKey,
  stickies,
  color,
  dimmed,
  participantsById,
  onExpand,
  onMove,
}: {
  cellKey: string;
  stickies: StickyRow[];
  color: ReturnType<typeof rowColor>;
  dimmed: boolean;
  participantsById: Map<string, { name: string; id: string }>;
  onExpand: () => void;
  onMove: (s: StickyRow) => void;
}) {
  void cellKey;
  const shown = stickies.slice(0, 3);
  const overflow = stickies.length - shown.length;
  const empty = stickies.length === 0;

  return (
    <div
      className={`p-2 min-h-[120px] border transition-opacity ${
        empty ? "border-dashed border-grey-300 bg-white" : "border-transparent"
      } ${dimmed ? "opacity-30 pointer-events-none" : ""}`}
      style={empty ? undefined : { backgroundColor: color.bg, borderColor: color.border }}
    >
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {shown.map((s) => (
            <StickyCard
              key={s.id}
              sticky={s}
              participantsById={participantsById}
              color={color}
              onMove={() => onMove(s)}
            />
          ))}
        </AnimatePresence>
        {overflow > 0 ? (
          <button
            onClick={onExpand}
            className="w-full text-xs text-grey-700 hover:text-foreground py-1"
          >
            + {overflow} more
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StickyCard({
  sticky,
  participantsById,
  color,
  onMove,
}: {
  sticky: StickyRow;
  participantsById: Map<string, { name: string; id: string }>;
  color: ReturnType<typeof rowColor>;
  onMove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const p = participantsById.get(sticky.participant_id);
  const pill = p ? pillColorForParticipant(p.id) : null;
  return (
    <motion.div
      layout
      layoutId={`sticky-${sticky.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="relative rounded-[6px] p-2 border text-xs"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: sticky.highlighted ? "#000F1E" : color.border,
        boxShadow: sticky.highlighted ? "0 0 0 2px #FFFF00 inset" : undefined,
      }}
    >
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="absolute top-1 right-1 text-grey-500 hover:text-foreground text-xs"
        aria-label="Actions"
      >
        ⋯
      </button>
      <p className="text-[12px] leading-snug text-foreground pr-4">{sticky.text}</p>
      {pill ? (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-1"
          style={{ backgroundColor: pill.bg, color: pill.fg }}
        >
          {p?.name}
        </span>
      ) : null}
      {menuOpen ? (
        <div className="absolute top-5 right-1 z-20 bg-white border border-border rounded-[4px] shadow-lg py-1 text-[12px]">
          <button
            onClick={() => {
              toggleHighlight({ id: sticky.id, highlighted: !sticky.highlighted });
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-1 hover:bg-grey-100 whitespace-nowrap"
          >
            {sticky.highlighted ? "★ Unpin" : "⭐ Pin"}
          </button>
          <button
            onClick={() => { onMove(); setMenuOpen(false); }}
            className="w-full text-left px-3 py-1 hover:bg-grey-100 whitespace-nowrap"
          >
            ➡ Move to…
          </button>
          <button
            onClick={() => {
              deleteSticky(sticky.id);
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-1 hover:bg-[var(--error-bg)] text-[var(--error-fg)] whitespace-nowrap"
          >
            🗑 Delete
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

function CellModal({
  cellKey,
  stickies,
  participantsById,
  onClose,
  onMove,
}: {
  cellKey: string;
  stickies: StickyRow[];
  participantsById: Map<string, { name: string; id: string }>;
  onClose: () => void;
  onMove: (s: StickyRow) => void;
}) {
  void cellKey;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[8px] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold">All contributions in this cell</h2>
          <button onClick={onClose} className="text-grey-700 hover:text-foreground text-2xl leading-none">
            ×
          </button>
        </div>
        <div className="space-y-2">
          {stickies.map((s) => {
            const p = participantsById.get(s.participant_id);
            const pill = p ? pillColorForParticipant(p.id) : null;
            return (
              <div key={s.id} className="rounded-[6px] border border-border p-3">
                <p className="text-sm text-foreground leading-snug">{s.text}</p>
                <div className="flex items-center gap-2 mt-2">
                  {pill ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ backgroundColor: pill.bg, color: pill.fg }}
                    >
                      {p?.name}
                    </span>
                  ) : null}
                  <button
                    onClick={() => toggleHighlight({ id: s.id, highlighted: !s.highlighted })}
                    className="text-xs text-grey-700 hover:text-foreground"
                  >
                    {s.highlighted ? "★ Unpin" : "⭐ Pin"}
                  </button>
                  <button onClick={() => onMove(s)} className="text-xs text-grey-700 hover:text-foreground">
                    ➡ Move
                  </button>
                  <button
                    onClick={() => deleteSticky(s.id)}
                    className="text-xs text-grey-700 hover:text-[var(--error-fg)]"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MoveDialog({
  sticky,
  columns,
  rows,
  onCancel,
  onMoveTo,
}: {
  sticky: StickyRow;
  columns: CanvasColumnRow[];
  rows: CanvasRowRow[];
  onCancel: () => void;
  onMoveTo: (colId: string, rowId: string) => void;
}) {
  const [colId, setColId] = useState(sticky.column_id);
  const [rowId, setRowId] = useState(sticky.row_id);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[8px] max-w-md w-full p-6"
      >
        <h3 className="text-[18px] font-semibold mb-4">Move sticky to…</h3>
        <p className="text-sm text-grey-700 mb-4 italic">&ldquo;{sticky.text}&rdquo;</p>
        <label className="block text-[13px] font-medium mb-1">Stage</label>
        <select
          value={colId}
          onChange={(e) => setColId(e.target.value)}
          className="w-full h-[40px] rounded-[4px] border border-border px-3 mb-3"
        >
          {columns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <label className="block text-[13px] font-medium mb-1">Dimension</label>
        <select
          value={rowId}
          onChange={(e) => setRowId(e.target.value)}
          className="w-full h-[40px] rounded-[4px] border border-border px-3 mb-5"
        >
          {rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="h-[40px] px-4 rounded-[4px] text-grey-800">
            Cancel
          </button>
          <button
            onClick={() => onMoveTo(colId, rowId)}
            className="h-[40px] px-4 rounded-[4px] bg-deep-blue-800 text-white text-sm font-medium"
          >
            Move
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
