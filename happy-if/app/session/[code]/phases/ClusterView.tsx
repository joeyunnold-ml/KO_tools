"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import type { GroupRow, ParticipantRow, ResponseRow } from "@/lib/types";
import {
  createGroup,
  deleteGroup,
  moveResponseToGroup,
  renameGroup,
} from "@/lib/actions";
import { type GroupPalette, paletteFor, pillColorForParticipant } from "@/lib/palette";

export default function ClusterView({
  state,
  onAdvance,
  advancing,
  buttonLabel,
  autoClustering,
  autoClusterError,
  onReCluster,
}: {
  state: SessionState;
  onAdvance: () => void;
  advancing: boolean;
  buttonLabel: string;
  autoClustering?: boolean;
  autoClusterError?: string | null;
  onReCluster?: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Sparkle finale: trigger when autoClustering transitions from true → false AND we have groups
  const [showFinale, setShowFinale] = useState(false);
  const prevAutoClustering = useRef(autoClustering);
  useEffect(() => {
    if (prevAutoClustering.current && !autoClustering && state.groups.length > 0 && !autoClusterError) {
      setShowFinale(true);
      const t = setTimeout(() => setShowFinale(false), 2200);
      return () => clearTimeout(t);
    }
    prevAutoClustering.current = autoClustering;
  }, [autoClustering, state.groups.length, autoClusterError]);

  const participantsById = useMemo(() => {
    const m = new Map<string, ParticipantRow>();
    state.participants.forEach((p) => m.set(p.id, p));
    return m;
  }, [state.participants]);

  const unclustered = state.responses.filter((r) => r.group_id === null);
  const groups = [...state.groups].sort((a, b) => a.sort_order - b.sort_order);
  const responsesByGroup = useMemo(() => {
    const m = new Map<string, ResponseRow[]>();
    groups.forEach((g) => m.set(g.id, []));
    state.responses.forEach((r) => {
      if (r.group_id && m.has(r.group_id)) m.get(r.group_id)!.push(r);
    });
    return m;
  }, [groups, state.responses]);

  const activeResponse = activeId ? state.responses.find((r) => r.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const responseId = String(e.active.id);
    const targetGroupId = String(e.over.id);
    const newGroupId = targetGroupId === "__unclustered__" ? null : targetGroupId;
    const response = state.responses.find((r) => r.id === responseId);
    if (!response || response.group_id === newGroupId) return;
    try {
      await moveResponseToGroup({ responseId, groupId: newGroupId });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    const label = newGroupLabel.trim();
    if (!label || !state.session) return;
    setNewGroupLabel("");
    try {
      await createGroup({
        sessionId: state.session.id,
        label,
        sortOrder: groups.length,
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <LayoutGroup>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col p-8 bg-white relative">
          <div className="flex items-baseline justify-between mb-6 gap-4">
            <h1 className="text-[28px] font-medium text-foreground">🗂️ Cluster the responses</h1>
            <div className="flex items-center gap-3">
              {onReCluster ? (
                <button
                  onClick={onReCluster}
                  disabled={advancing || autoClustering}
                  className="h-[44px] rounded-[4px] bg-white border border-foreground text-foreground px-5 text-sm font-medium hover:bg-grey-100 disabled:opacity-40"
                  title="Ask the AI to redo the clusters from scratch"
                >
                  🔄 Re-cluster
                </button>
              ) : null}
              <button
                onClick={onAdvance}
                disabled={advancing || groups.length === 0}
                className="h-[44px] rounded-[4px] bg-deep-blue-800 text-white px-6 text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-40"
              >
                {advancing ? "Starting…" : buttonLabel}
              </button>
            </div>
          </div>

          {autoClustering ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-[8px] bg-yellow-500/20 border border-yellow-500 px-4 py-3 text-sm text-foreground flex items-center gap-2"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-deep-blue-800 animate-pulse" />
              🤖 Auto-clustering responses
            </motion.div>
          ) : null}
          {autoClusterError ? (
            <div className="mb-4 rounded-[8px] bg-[var(--error-bg)] border border-[var(--error-fg)] px-4 py-3 text-sm text-[var(--error-fg)]">
              ⚠️ Auto-cluster failed: <span className="font-mono text-xs">{autoClusterError}</span>. You can still cluster manually below, or try Re-cluster.
            </div>
          ) : null}

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
            {/* Unclustered column */}
            <UnclusteredColumn
              responses={unclustered}
              participantsById={participantsById}
              groups={groups}
            />

            {/* Groups */}
            <div className="lg:col-span-2 min-h-0 flex flex-col">
              <form onSubmit={handleCreateGroup} className="flex gap-2 mb-4">
                <input
                  value={newGroupLabel}
                  onChange={(e) => setNewGroupLabel(e.target.value)}
                  placeholder="➕ New group (e.g., Conversion Recovery)"
                  className="flex-1 h-[42px] rounded-[4px] border border-border px-[14px] bg-white focus:outline-none focus:border-foreground text-sm"
                />
                <button
                  type="submit"
                  disabled={!newGroupLabel.trim()}
                  className="h-[44px] rounded-[4px] bg-yellow-500 text-foreground px-6 text-sm font-medium hover:bg-yellow-600 disabled:opacity-40"
                >
                  ➕ Add
                </button>
              </form>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto auto-rows-min content-start">
                <AnimatePresence mode="popLayout">
                  {groups.length === 0 && !autoClustering ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="md:col-span-2 rounded-[8px] border-2 border-dashed border-border p-8 text-center text-grey-700 text-sm"
                    >
                      👆 Create a group above, then drag cards into it.
                    </motion.div>
                  ) : null}
                  {autoClustering && groups.length === 0
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonGroup key={`skeleton-${i}`} delay={i * 0.2} palette={paletteFor(i)} />
                      ))
                    : null}
                  {groups.map((g, idx) => (
                    <GroupColumn
                      key={g.id}
                      group={g}
                      index={idx}
                      responses={responsesByGroup.get(g.id) ?? []}
                      participantsById={participantsById}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Finale sparkle overlay */}
          <AnimatePresence>
            {showFinale ? (
              <motion.div
                key="finale"
                className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ scale: 0.2, opacity: 0, rotate: -15 }}
                  animate={{ scale: [0.2, 1.4, 1.0, 0.6], opacity: [0, 1, 1, 0], rotate: [-15, 10, -5, 0] }}
                  transition={{ duration: 2.0, times: [0, 0.35, 0.65, 1], ease: "easeOut" }}
                  className="text-[260px] drop-shadow-2xl select-none"
                >
                  ✨
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <DragOverlay>
          {activeResponse ? (
            <CardSurface
              response={activeResponse}
              participantName={participantsById.get(activeResponse.participant_id)?.name ?? "—"}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </LayoutGroup>
  );
}

function SkeletonGroup({ delay, palette }: { delay: number; palette: GroupPalette }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
      className="rounded-[8px] p-5 border-2"
    >
      <div className="h-5 w-2/3 rounded bg-white/70 animate-pulse mb-3" />
      <div className="space-y-2">
        <div className="h-7 rounded bg-white/60 animate-pulse" />
        <div className="h-7 rounded bg-white/60 animate-pulse" />
      </div>
    </motion.div>
  );
}

function UnclusteredColumn({
  responses,
  participantsById,
  groups,
}: {
  responses: ResponseRow[];
  participantsById: Map<string, ParticipantRow>;
  groups: GroupRow[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "__unclustered__" });
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700">
          📋 Unclustered ({responses.length})
        </h2>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-[8px] p-3 space-y-2 overflow-y-auto border-2 transition-colors ${
          isOver ? "border-foreground bg-grey-100" : "border-border bg-grey-100"
        }`}
      >
        <AnimatePresence mode="popLayout">
          {responses.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-grey-600 py-8 text-sm"
            >
              🎉 All clustered.
            </motion.p>
          ) : null}
          {responses.map((r) => (
            <DraggableResponseCard
              key={r.id}
              response={r}
              participantName={participantsById.get(r.participant_id)?.name ?? "—"}
              groups={groups}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GroupColumn({
  group,
  index,
  responses,
  participantsById,
}: {
  group: GroupRow;
  index: number;
  responses: ResponseRow[];
  participantsById: Map<string, ParticipantRow>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(group.label);
  const palette = paletteFor(index);

  async function commitRename() {
    setEditing(false);
    if (label.trim() && label !== group.label) {
      try { await renameGroup({ id: group.id, label: label.trim() }); } catch (e) { console.error(e); }
    } else {
      setLabel(group.label);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete group "${group.label}"? Cards will return to Unclustered.`)) return;
    try { await deleteGroup(group.id); } catch (e) { console.error(e); }
  }

  return (
    <motion.div
      layout
      layoutId={`group-${group.id}`}
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      ref={setNodeRef}
      style={{
        backgroundColor: isOver ? palette.border : palette.bg,
        borderColor: isOver ? palette.text : palette.border,
      }}
      className="rounded-[8px] p-5 border-2 transition-colors"
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setEditing(false); setLabel(group.label); } }}
            className="text-[18px] font-semibold flex-1 border-b bg-transparent focus:outline-none"
            style={{ borderColor: palette.text, color: palette.text }}
          />
        ) : (
          <h3
            className="text-[18px] font-semibold flex-1 cursor-text"
            onClick={() => setEditing(true)}
            style={{ color: palette.text }}
          >
            {group.label} <span className="opacity-50 font-normal">({responses.length})</span>
          </h3>
        )}
        <button
          onClick={handleDelete}
          className="text-grey-600 hover:text-[var(--error-fg)] text-sm px-2"
          aria-label="Delete group"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2 min-h-[40px]">
        <AnimatePresence mode="popLayout">
          {responses.map((r) => (
            <DraggableResponseCard
              key={r.id}
              response={r}
              participantName={participantsById.get(r.participant_id)?.name ?? "—"}
              inGroup
              palette={palette}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DraggableResponseCard({
  response,
  participantName,
  groups,
  inGroup,
  palette,
}: {
  response: ResponseRow;
  participantName: string;
  groups?: GroupRow[];
  inGroup?: boolean;
  palette?: GroupPalette;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: response.id });
  return (
    <motion.div
      ref={setNodeRef}
      layout
      layoutId={`response-${response.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="touch-none"
    >
      <CardSurface
        response={response}
        participantName={participantName}
        groups={groups}
        inGroup={inGroup}
        palette={palette}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </motion.div>
  );
}

function CardSurface({
  response,
  participantName,
  groups,
  inGroup,
  dragging,
  dragHandleProps,
  palette,
}: {
  response: ResponseRow;
  participantName: string;
  groups?: GroupRow[];
  inGroup?: boolean;
  dragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  palette?: GroupPalette;
}) {
  const [expanded, setExpanded] = useState(false);
  const pill = pillColorForParticipant(response.participant_id);
  const surfaceBg = palette ? "#FFFFFF" : "#FFFFFF";
  const borderColor = palette ? palette.pill : "var(--border)";

  // Short label fallback: use summary if available, else first 60 chars
  const shortLabel = response.summary?.trim() || (response.text.length > 60 ? response.text.slice(0, 60) + "…" : response.text);

  return (
    <div
      className={`rounded-[6px] border ${
        dragging ? "shadow-lg ring-2 ring-foreground rotate-1" : ""
      }`}
      style={{ backgroundColor: surfaceBg, borderColor }}
    >
      <div className="flex items-center gap-2 p-2.5">
        <span
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-grey-500 select-none"
          aria-label="Drag"
        >
          ⋮⋮
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left flex items-center gap-2 min-w-0"
        >
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0"
            style={{ backgroundColor: pill.bg, color: pill.fg }}
          >
            {participantName}
          </span>
          <span className="text-[13px] text-foreground truncate flex-1 leading-tight">
            {shortLabel}
          </span>
          <span className="text-grey-500 text-xs flex-shrink-0">
            {expanded ? "▾" : "▸"}
          </span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-grey-200">
              <p className="text-sm leading-snug text-foreground italic">&ldquo;{response.text}&rdquo;</p>
              {groups && !inGroup && groups.length > 0 ? (
                <select
                  className="mt-2 w-full text-xs rounded-[4px] border border-border px-2 py-1 bg-grey-100 text-foreground"
                  value=""
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (!val) return;
                    try { await moveResponseToGroup({ responseId: response.id, groupId: val }); } catch (err) { console.error(err); }
                  }}
                >
                  <option value="">Assign to group…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              ) : null}
              {inGroup ? (
                <button
                  onClick={() => moveResponseToGroup({ responseId: response.id, groupId: null }).catch(console.error)}
                  className="mt-2 text-xs text-grey-600 hover:text-foreground"
                >
                  ← back to unclustered
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
