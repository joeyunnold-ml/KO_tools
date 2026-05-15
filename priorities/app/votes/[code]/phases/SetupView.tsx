"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import type { VoteState } from "@/lib/useVotes";
import type { VotePriorityRow } from "@/lib/types";
import {
  createPriority,
  deletePriority,
  setConfig,
  updatePriority,
} from "@/lib/actions";
import { teamColor } from "@/lib/palette";

export default function SetupView({
  state,
  token,
  onOpen,
  busy,
}: {
  state: VoteState;
  token: string;
  onOpen: () => void;
  busy: boolean;
}) {
  if (!state.session) return null;
  const code = state.session.room_code;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join/${code}`;
  const participants = state.participants.filter((p) => !p.is_facilitator);
  const priorities = [...state.priorities].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 p-6 lg:p-10 bg-white overflow-y-auto">
      <div className="min-w-0">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
          🛠️ Session setup
        </p>
        <h1 className="text-[28px] font-medium text-foreground mb-1">Priority Vote</h1>
        <p className="text-[14px] text-grey-700 mb-6">
          Pre-load the priorities the room will vote on. Add anything that surfaced today.
        </p>

        <PriorityList sessionId={state.session.id} priorities={priorities} />

        <hr className="my-8 border-grey-300" />

        <section>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
            ⚙️ Configuration
          </p>
          <ConfigToggle
            checked={state.session.capture_enabled}
            label="Allow participants to suggest priorities (capture phase)"
            description="ON: before voting, participants can submit additions. OFF (recommended for closing exercise): vote on pre-loaded items only."
            onChange={(v) =>
              setConfig({
                sessionId: state.session!.id,
                facilitatorToken: token,
                captureEnabled: v,
              })
            }
          />
          <div className="rounded-[6px] p-3 hover:bg-grey-100 flex items-start gap-3">
            <label className="text-[14px] font-medium text-foreground flex-1">
              Votes per person
              <p className="text-[12px] text-grey-700 font-normal mt-0.5">
                Default 3. Lower for short lists (3-4 items); higher for long lists (10+).
              </p>
            </label>
            <select
              value={state.session.votes_per_person}
              onChange={(e) =>
                setConfig({
                  sessionId: state.session!.id,
                  facilitatorToken: token,
                  votesPerPerson: parseInt(e.target.value, 10),
                })
              }
              className="h-[36px] rounded-[4px] border border-border px-2 bg-white text-sm"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-[8px] border border-border bg-grey-100 p-5">
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            🔑 Join code
          </p>
          <p className="text-[64px] font-bold tracking-tight text-foreground leading-none">{code}</p>
          <p className="mt-2 text-[13px] text-grey-800 break-all">
            📱 {origin.replace(/^https?:\/\//, "")}/join/{code}
          </p>
          <div className="mt-4 bg-white p-3 rounded-[6px] inline-block border border-border">
            <QRCodeSVG value={joinUrl} size={180} level="M" fgColor="#000F1E" />
          </div>
        </div>

        <div className="rounded-[8px] border border-border bg-white p-4">
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            👥 Joined ({participants.length})
          </p>
          {participants.length === 0 ? (
            <p className="text-sm text-grey-600">Nobody yet — participants can join anytime.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => {
                const tc = teamColor(p.team);
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium"
                    style={{ backgroundColor: tc.bg, color: tc.fg }}
                  >
                    {p.name}
                    <span className="opacity-60 text-[10px]">{tc.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={onOpen}
          disabled={busy}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-6 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40 transition-colors"
        >
          {busy ? "Opening…" : state.session.capture_enabled ? "▶️ Open suggestions →" : "▶️ Start voting →"}
        </button>
      </aside>
    </div>
  );
}

function ConfigToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-[6px] hover:bg-grey-100 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-5 h-5 accent-deep-blue-800"
      />
      <div className="flex-1">
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        <p className="text-[12px] text-grey-700 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

function PriorityList({ sessionId, priorities }: { sessionId: string; priorities: VotePriorityRow[] }) {
  return (
    <section>
      <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
        📋 Priorities ({priorities.length})
      </p>
      <div className="space-y-2 mb-4">
        <AnimatePresence mode="popLayout">
          {priorities.map((p, i) => (
            <PriorityRow key={p.id} priority={p} index={i} />
          ))}
        </AnimatePresence>
        {priorities.length === 0 ? (
          <p className="text-sm text-grey-600 italic py-2">
            No priorities yet. Add some below — or enable capture and let participants submit them.
          </p>
        ) : null}
      </div>
      <AddPriorityForm sessionId={sessionId} nextSortOrder={priorities.length} />
    </section>
  );
}

function PriorityRow({ priority, index }: { priority: VotePriorityRow; index: number }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(priority.title);
  const [description, setDescription] = useState(priority.description ?? "");
  const [accessNeeded, setAccessNeeded] = useState(priority.access_needed ?? "");

  async function commit() {
    setEditing(false);
    await updatePriority({
      id: priority.id,
      title: title.trim() || priority.title,
      description: description.trim() || null,
      accessNeeded: accessNeeded.trim() || null,
    });
  }

  async function remove() {
    if (!window.confirm(`Delete "${priority.title}"?`)) return;
    await deletePriority(priority.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-[6px] border border-border bg-white p-3"
    >
      <div className="flex items-start gap-3">
        <span className="text-sm font-medium text-grey-500 tabular-nums w-6 pt-0.5">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                placeholder="Title"
                className="w-full rounded-[4px] border border-border px-2 py-1 text-sm font-medium focus:outline-none focus:border-foreground"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                placeholder="Description (optional)"
                rows={2}
                className="w-full rounded-[4px] border border-border px-2 py-1 text-sm focus:outline-none focus:border-foreground resize-none"
              />
              <input
                value={accessNeeded}
                onChange={(e) => setAccessNeeded(e.target.value)}
                placeholder="Access needed (optional)"
                className="w-full rounded-[4px] border border-border px-2 py-1 text-xs focus:outline-none focus:border-foreground"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setTitle(priority.title);
                    setDescription(priority.description ?? "");
                    setAccessNeeded(priority.access_needed ?? "");
                  }}
                  className="h-7 px-3 text-xs rounded-[4px] text-grey-800"
                >
                  Cancel
                </button>
                <button
                  onClick={commit}
                  className="h-7 px-3 text-xs rounded-[4px] bg-deep-blue-800 text-white font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[14px] font-medium text-foreground">{priority.title}</p>
              {priority.description ? (
                <p className="text-[12px] text-grey-700 mt-0.5">{priority.description}</p>
              ) : null}
              {priority.access_needed ? (
                <p className="text-[11px] text-grey-600 mt-1 italic">Access: {priority.access_needed}</p>
              ) : null}
            </>
          )}
        </div>
        {!editing ? (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="text-xs text-grey-700 hover:text-foreground px-1" aria-label="Edit">
              ✏️
            </button>
            <button onClick={remove} className="text-xs text-grey-700 hover:text-[var(--error-fg)] px-1" aria-label="Delete">
              ✕
            </button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function AddPriorityForm({ sessionId, nextSortOrder }: { sessionId: string; nextSortOrder: number }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessNeeded, setAccessNeeded] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    try {
      await createPriority({
        sessionId,
        title: t,
        description: description.trim() || null,
        accessNeeded: accessNeeded.trim() || null,
        isPreloaded: true,
        sortOrder: nextSortOrder,
      });
      setTitle("");
      setDescription("");
      setAccessNeeded("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[6px] border-2 border-dashed border-grey-300 p-3 space-y-2 bg-grey-100">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        placeholder="+ Add priority (title, max 100 chars)"
        className="w-full rounded-[4px] border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 200))}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-[4px] border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground resize-none"
      />
      <div className="flex gap-2">
        <input
          value={accessNeeded}
          onChange={(e) => setAccessNeeded(e.target.value)}
          placeholder="Access needed (optional)"
          className="flex-1 rounded-[4px] border border-border px-3 py-2 text-xs bg-white focus:outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={!title.trim() || busy}
          className="h-[36px] rounded-[4px] bg-yellow-500 text-foreground px-4 text-sm font-medium hover:bg-yellow-600 disabled:opacity-40"
        >
          ➕ Add
        </button>
      </div>
    </form>
  );
}
