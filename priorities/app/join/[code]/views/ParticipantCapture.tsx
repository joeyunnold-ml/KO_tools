"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { VoteState } from "@/lib/useVotes";
import { createPriority, deletePriority, updatePriority } from "@/lib/actions";
import { pillColorForParticipant } from "@/lib/palette";

export default function ParticipantCapture({
  state,
  participantId,
}: {
  state: VoteState;
  participantId: string;
}) {
  const priorities = [...state.priorities].sort((a, b) => a.sort_order - b.sort_order);
  const participantsById = new Map(state.participants.map((p) => [p.id, p]));

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 bg-grey-100">
      <div className="max-w-2xl mx-auto w-full">
        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
          📥 Suggest priorities
        </p>
        <h1 className="text-[22px] md:text-[28px] font-medium text-foreground mb-1">
          Add anything that was missed
        </h1>
        <p className="text-[13px] text-grey-700 mb-5">
          {priorities.length} item{priorities.length === 1 ? "" : "s"} so far.
        </p>

        <AddForm sessionId={state.session!.id} participantId={participantId} nextSortOrder={priorities.length} />

        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mt-8 mb-3">
          📋 All priorities
        </p>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {priorities.map((p) => {
              const submitter = p.submitted_by ? participantsById.get(p.submitted_by) : null;
              const pill = submitter ? pillColorForParticipant(submitter.id) : null;
              const isMine = p.submitted_by === participantId;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-[6px] border border-border bg-white p-3"
                >
                  {isMine ? (
                    <MyPriorityEditor priority={p} />
                  ) : (
                    <>
                      <p className="text-[14px] font-medium text-foreground">{p.title}</p>
                      {p.description ? (
                        <p className="text-[12px] text-grey-700 mt-0.5">{p.description}</p>
                      ) : null}
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {p.is_preloaded ? (
                          <span className="text-[10px] uppercase tracking-wider text-grey-600 bg-grey-100 px-1.5 py-0.5 rounded">
                            pre-loaded
                          </span>
                        ) : null}
                        {submitter && pill ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ backgroundColor: pill.bg, color: pill.fg }}
                          >
                            {submitter.name}
                          </span>
                        ) : null}
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <p className="mt-8 text-xs text-grey-600 text-center">
          ⏳ Waiting for the facilitator to close suggestions and start voting…
        </p>
      </div>
    </main>
  );
}

function AddForm({
  sessionId,
  participantId,
  nextSortOrder,
}: {
  sessionId: string;
  participantId: string;
  nextSortOrder: number;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createPriority({
        sessionId,
        title: title.trim(),
        description: description.trim() || null,
        isPreloaded: false,
        submittedBy: participantId,
        sortOrder: nextSortOrder,
      });
      setTitle("");
      setDescription("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="rounded-[8px] border-2 border-dashed border-grey-300 bg-white p-3 space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        placeholder="+ Title"
        className="w-full rounded-[4px] border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 200))}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-[4px] border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground resize-none"
      />
      <button
        type="submit"
        disabled={!title.trim() || busy}
        className="w-full h-[40px] rounded-[4px] bg-deep-blue-800 text-white text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-40"
      >
        {busy ? "Adding…" : "➕ Suggest priority"}
      </button>
    </form>
  );
}

function MyPriorityEditor({ priority }: { priority: VoteState["priorities"][number] }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(priority.title);
  const [description, setDescription] = useState(priority.description ?? "");
  async function save() {
    await updatePriority({
      id: priority.id,
      title: title.trim() || priority.title,
      description: description.trim() || null,
    });
    setEditing(false);
  }
  async function remove() {
    if (!window.confirm("Delete your suggestion?")) return;
    await deletePriority(priority.id);
  }
  if (editing) {
    return (
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 100))}
          className="w-full rounded-[4px] border border-border px-2 py-1 text-sm font-medium focus:outline-none focus:border-foreground"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 200))}
          rows={2}
          className="w-full rounded-[4px] border border-border px-2 py-1 text-sm focus:outline-none focus:border-foreground resize-none"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setEditing(false);
              setTitle(priority.title);
              setDescription(priority.description ?? "");
            }}
            className="h-7 px-3 text-xs rounded-[4px] text-grey-800"
          >
            Cancel
          </button>
          <button onClick={save} className="h-7 px-3 text-xs rounded-[4px] bg-deep-blue-800 text-white font-medium">
            Save
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <p className="text-[14px] font-medium text-foreground">{priority.title}</p>
      {priority.description ? (
        <p className="text-[12px] text-grey-700 mt-0.5">{priority.description}</p>
      ) : null}
      <div className="mt-1.5 flex items-center gap-3 text-xs">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500 text-foreground">
          you
        </span>
        <button onClick={() => setEditing(true)} className="text-grey-700 hover:text-foreground">
          ✏️ edit
        </button>
        <button onClick={remove} className="text-grey-700 hover:text-[var(--error-fg)]">
          🗑 delete
        </button>
      </div>
    </>
  );
}
