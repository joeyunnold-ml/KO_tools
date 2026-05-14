"use client";

import { useMemo, useState } from "react";
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
import type { SessionState } from "@/lib/useSession";
import type { GroupRow, ParticipantRow, ResponseRow } from "@/lib/types";
import {
  createGroup,
  deleteGroup,
  moveResponseToGroup,
  renameGroup,
} from "@/lib/actions";

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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col p-8 bg-white">
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
          <div className="mb-4 rounded-[8px] bg-yellow-500/20 border border-yellow-500 px-4 py-3 text-sm text-foreground flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-deep-blue-800 animate-pulse" />
            🤖 Auto-clustering responses with Opus 4.6… (groups will appear when ready)
          </div>
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

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto auto-rows-min">
              {groups.length === 0 ? (
                <div className="md:col-span-2 rounded-[8px] border-2 border-dashed border-border p-8 text-center text-grey-700 text-sm">
                  👆 Create a group above, then drag cards into it.
                </div>
              ) : null}
              {groups.map((g) => (
                <GroupColumn
                  key={g.id}
                  group={g}
                  responses={responsesByGroup.get(g.id) ?? []}
                  participantsById={participantsById}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeResponse ? (
          <ResponseCardPresentation
            response={activeResponse}
            participantName={participantsById.get(activeResponse.participant_id)?.name ?? "—"}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
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
        className={`flex-1 rounded-[8px] p-3 space-y-3 overflow-y-auto border-2 transition-colors ${
          isOver ? "border-foreground bg-grey-100" : "border-border bg-grey-100"
        }`}
      >
        {responses.length === 0 ? (
          <p className="text-center text-grey-600 py-8 text-sm">🎉 All clustered.</p>
        ) : null}
        {responses.map((r) => (
          <DraggableResponseCard
            key={r.id}
            response={r}
            participantName={participantsById.get(r.participant_id)?.name ?? "—"}
            groups={groups}
          />
        ))}
      </div>
    </div>
  );
}

function GroupColumn({
  group,
  responses,
  participantsById,
}: {
  group: GroupRow;
  responses: ResponseRow[];
  participantsById: Map<string, ParticipantRow>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(group.label);

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
    <div
      ref={setNodeRef}
      className={`rounded-[8px] p-6 border-2 transition-colors ${
        isOver ? "border-foreground bg-yellow-500/10" : "border-border bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-4 gap-2">
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setEditing(false); setLabel(group.label); } }}
            className="text-[18px] font-semibold flex-1 border-b border-foreground bg-transparent focus:outline-none"
          />
        ) : (
          <h3
            className="text-[18px] font-semibold flex-1 cursor-text text-foreground"
            onClick={() => setEditing(true)}
          >
            {group.label} <span className="text-grey-600 font-normal">({responses.length})</span>
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
      <div className="space-y-2 min-h-[60px]">
        {responses.map((r) => (
          <DraggableResponseCard
            key={r.id}
            response={r}
            participantName={participantsById.get(r.participant_id)?.name ?? "—"}
            inGroup
          />
        ))}
      </div>
    </div>
  );
}

function DraggableResponseCard({
  response,
  participantName,
  groups,
  inGroup,
}: {
  response: ResponseRow;
  participantName: string;
  groups?: GroupRow[];
  inGroup?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: response.id });
  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.3 : 1 }} className="touch-none">
      <ResponseCardPresentation response={response} participantName={participantName} groups={groups} inGroup={inGroup} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function ResponseCardPresentation({
  response,
  participantName,
  groups,
  inGroup,
  dragging,
  dragHandleProps,
}: {
  response: ResponseRow;
  participantName: string;
  groups?: GroupRow[];
  inGroup?: boolean;
  dragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div
      className={`rounded-[4px] bg-white border border-border p-3 ${
        dragging ? "shadow-lg ring-2 ring-foreground rotate-1" : ""
      }`}
    >
      <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
        <p className="text-sm leading-snug text-foreground">&ldquo;{response.text}&rdquo;</p>
        <p className="mt-2 text-xs text-grey-700">— {participantName}</p>
      </div>
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
  );
}
