"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { CanvasState } from "@/lib/useCanvas";
import type { CanvasColumnRow, CanvasRowRow, StickyRow } from "@/lib/types";
import { pillColorForParticipant, rowColor } from "@/lib/palette";
import {
  createSticky,
  deleteSticky,
  moveSticky,
  setFocusedColumn,
  toggleHighlight,
} from "@/lib/actions";
import { downloadMarkdown } from "@/lib/exportMarkdown";

const MAX_STICKY_LEN = 200;

export default function ContributeView({
  state,
  token,
  facilitatorParticipantId,
  onEdit,
}: {
  state: CanvasState;
  token: string;
  facilitatorParticipantId: string | null;
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
  const realParticipants = state.participants.filter((p) => !p.is_facilitator);

  const focusedColumnId = state.canvas.focused_column_id;

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

  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [moving, setMoving] = useState<StickyRow | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function focusColumn(id: string | null) {
    if (!state.canvas) return;
    await setFocusedColumn({
      canvasId: state.canvas.id,
      facilitatorToken: token,
      columnId: id,
    });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    if (!e.over) return;
    const stickyId = String(e.active.id);
    const overKey = String(e.over.id);
    const [columnId, rowId] = overKey.split("__");
    if (!columnId || !rowId) return;
    const sticky = state.stickies.find((s) => s.id === stickyId);
    if (!sticky) return;
    if (sticky.column_id === columnId && sticky.row_id === rowId) return;
    try {
      await moveSticky({ id: stickyId, columnId, rowId });
    } catch (err) {
      console.error(err);
    }
  }

  const activeDragSticky = activeDragId
    ? state.stickies.find((s) => s.id === activeDragId) ?? null
    : null;
  const activeDragRowColor = activeDragSticky
    ? rowColor(rows.find((r) => r.id === activeDragSticky.row_id)?.color ?? "gray")
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            <span className="text-sm text-grey-700">👥 {realParticipants.length} joined</span>
            <span className="text-xs text-grey-600">
              💡 Drag stickies between cells · Double-click an empty cell to add
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
                  facilitatorParticipantId={facilitatorParticipantId}
                  canvasId={state.canvas!.id}
                  onExpand={setExpandedCell}
                  onMove={setMoving}
                />
              );
            })}
          </div>
        </div>

        {/* Drag overlay — floating sticky during drag */}
        <DragOverlay>
          {activeDragSticky && activeDragRowColor ? (
            <StickyVisual
              sticky={activeDragSticky}
              participantsById={participantsById}
              color={activeDragRowColor}
              dragging
            />
          ) : null}
        </DragOverlay>

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
    </DndContext>
  );
}

function RowFragment({
  row,
  color,
  columns,
  focusedColumnId,
  stickiesByCell,
  participantsById,
  facilitatorParticipantId,
  canvasId,
  onExpand,
  onMove,
}: {
  row: CanvasRowRow;
  color: ReturnType<typeof rowColor>;
  columns: CanvasColumnRow[];
  focusedColumnId: string | null;
  stickiesByCell: Map<string, StickyRow[]>;
  participantsById: Map<string, { name: string; id: string }>;
  facilitatorParticipantId: string | null;
  canvasId: string;
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
            columnId={c.id}
            rowId={row.id}
            stickies={cellStickies}
            color={color}
            dimmed={dimmed}
            participantsById={participantsById}
            facilitatorParticipantId={facilitatorParticipantId}
            canvasId={canvasId}
            onExpand={() => onExpand(key)}
            onMove={onMove}
          />
        );
      })}
    </>
  );
}

function Cell({
  columnId,
  rowId,
  stickies,
  color,
  dimmed,
  participantsById,
  facilitatorParticipantId,
  canvasId,
  onExpand,
  onMove,
}: {
  columnId: string;
  rowId: string;
  stickies: StickyRow[];
  color: ReturnType<typeof rowColor>;
  dimmed: boolean;
  participantsById: Map<string, { name: string; id: string }>;
  facilitatorParticipantId: string | null;
  canvasId: string;
  onExpand: () => void;
  onMove: (s: StickyRow) => void;
}) {
  const cellKey = `${columnId}__${rowId}`;
  const { setNodeRef, isOver } = useDroppable({ id: cellKey });
  const shown = stickies.slice(0, 3);
  const overflow = stickies.length - shown.length;
  const empty = stickies.length === 0;

  const [adding, setAdding] = useState(false);

  function enterAddMode() {
    if (dimmed) return;
    setAdding(true);
  }

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={enterAddMode}
      className={`p-2 min-h-[120px] border transition-all ${
        isOver ? "ring-2 ring-foreground" : ""
      } ${empty && !adding ? "border-dashed border-grey-300 bg-white" : "border-transparent"} ${
        dimmed ? "opacity-30 pointer-events-none" : ""
      }`}
      style={empty && !adding ? undefined : { backgroundColor: color.bg, borderColor: color.border }}
    >
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {shown.map((s) => (
            <DraggableStickyCard
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

        {/* Inline add input */}
        {adding ? (
          <AddStickyInline
            canvasId={canvasId}
            columnId={columnId}
            rowId={rowId}
            participantId={facilitatorParticipantId}
            color={color}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            onClick={enterAddMode}
            className="w-full text-left text-xs text-grey-600 hover:text-foreground py-1 px-1.5 rounded-[3px] hover:bg-white/60"
          >
            + Add sticky
          </button>
        )}
      </div>
    </div>
  );
}

function AddStickyInline({
  canvasId,
  columnId,
  rowId,
  participantId,
  color,
  onDone,
}: {
  canvasId: string;
  columnId: string;
  rowId: string;
  participantId: string | null;
  color: ReturnType<typeof rowColor>;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    if (!participantId) {
      window.alert(
        "No facilitator participant found. Refresh the page and try again — the facilitator participant is created when you create the canvas.",
      );
      return;
    }
    setBusy(true);
    try {
      await createSticky({ canvasId, columnId, rowId, participantId, text });
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-[6px] border-2 p-2"
      style={{ backgroundColor: "#FFFFFF", borderColor: color.text }}
    >
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_STICKY_LEN))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onDone();
          }
        }}
        placeholder="Type a sticky… (⌘/Ctrl+Enter to save)"
        rows={3}
        className="w-full rounded-[3px] border border-border px-2 py-1 text-[12px] focus:outline-none focus:border-foreground resize-none"
      />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-grey-600">{MAX_STICKY_LEN - draft.length}</span>
        <div className="flex gap-1">
          <button
            onClick={onDone}
            className="h-6 px-2 text-[11px] rounded-[3px] text-grey-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!draft.trim() || busy}
            className="h-6 px-2 text-[11px] rounded-[3px] bg-deep-blue-800 text-white font-medium disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function DraggableStickyCard({
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: sticky.id });
  return (
    <motion.div
      ref={setNodeRef}
      layout
      layoutId={`sticky-${sticky.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="touch-none"
    >
      <StickyVisual
        sticky={sticky}
        participantsById={participantsById}
        color={color}
        dragHandleProps={{ ...attributes, ...listeners }}
        onMove={onMove}
      />
    </motion.div>
  );
}

function StickyVisual({
  sticky,
  participantsById,
  color,
  dragging,
  dragHandleProps,
  onMove,
}: {
  sticky: StickyRow;
  participantsById: Map<string, { name: string; id: string }>;
  color: ReturnType<typeof rowColor>;
  dragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onMove?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const p = participantsById.get(sticky.participant_id);
  const pill = p ? pillColorForParticipant(p.id) : null;
  return (
    <div
      className={`relative rounded-[6px] p-2 border text-xs ${
        dragging ? "shadow-lg ring-2 ring-foreground rotate-1" : ""
      }`}
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: sticky.highlighted ? "#000F1E" : color.border,
        boxShadow: sticky.highlighted ? "0 0 0 2px #FFFF00 inset" : undefined,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      {/* Drag handle covers the body */}
      <div {...dragHandleProps} className="absolute inset-0 z-0" />
      {/* Click-to-stop layer for menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 z-10 text-grey-500 hover:text-foreground text-xs px-1"
        aria-label="Actions"
      >
        ⋯
      </button>
      <div className="relative pointer-events-none">
        <p className="text-[12px] leading-snug text-foreground pr-4">{sticky.text}</p>
        {pill ? (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-1"
            style={{ backgroundColor: pill.bg, color: pill.fg }}
          >
            {p?.name}
          </span>
        ) : null}
      </div>
      {menuOpen ? (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-5 right-1 z-20 bg-white border border-border rounded-[4px] shadow-lg py-1 text-[12px]"
        >
          <button
            onClick={() => {
              toggleHighlight({ id: sticky.id, highlighted: !sticky.highlighted });
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-1 hover:bg-grey-100 whitespace-nowrap"
          >
            {sticky.highlighted ? "★ Unpin" : "⭐ Pin"}
          </button>
          {onMove ? (
            <button
              onClick={() => {
                onMove();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1 hover:bg-grey-100 whitespace-nowrap"
            >
              ➡ Move to…
            </button>
          ) : null}
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
    </div>
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
