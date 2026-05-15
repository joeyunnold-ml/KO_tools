"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { VoteState } from "@/lib/useVotes";
import type { VotePriorityRow } from "@/lib/types";
import { buildRanking } from "@/lib/ranking";
import { createPriority, updatePriority } from "@/lib/actions";
import { downloadMarkdown } from "@/lib/exportMarkdown";

export default function AssignView({
  state,
  token,
  onComplete,
  busy,
}: {
  state: VoteState;
  token: string;
  onComplete: () => void;
  busy: boolean;
}) {
  void token;
  if (!state.session) return null;
  const ranked = useMemo(() => buildRanking(state), [state]);
  const participants = state.participants.filter((p) => !p.is_facilitator);
  const mlSuggestions = participants.filter((p) => p.team === "monstarlab").map((p) => p.name);
  const avisSuggestions = participants.filter((p) => p.team === "avis").map((p) => p.name);

  const [shareCopied, setShareCopied] = useState(false);
  function copyShareLink() {
    const url = `${window.location.origin}/votes/${state.session!.room_code}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2200);
      },
      () => window.prompt("Copy this link:", url),
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 bg-white">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
            🏆 Priorities — ranked by vote
          </p>
          <h1 className="text-[28px] font-medium text-foreground">Assign owners &amp; first actions</h1>
          <p className="text-[14px] text-grey-700 mt-1">
            Walk through top-down. Fill in fields as the room agrees. Updates sync to everyone live.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={copyShareLink}
            className="h-[44px] rounded-[4px] bg-white border border-foreground text-foreground px-5 text-sm font-medium hover:bg-grey-100"
          >
            {shareCopied ? "✓ Link copied" : "🔗 Copy share link"}
          </button>
          <button
            onClick={() => downloadMarkdown(state)}
            className="h-[44px] rounded-[4px] bg-yellow-500 text-foreground px-5 text-sm font-medium hover:bg-yellow-600"
          >
            📥 Export Markdown
          </button>
          <button
            onClick={onComplete}
            disabled={busy}
            className="h-[44px] rounded-[4px] bg-deep-blue-800 text-white px-5 text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-40"
          >
            {busy ? "Closing…" : "🏁 Mark complete"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-w-5xl">
        <AnimatePresence mode="popLayout">
          {ranked.map((r) => (
            <AssignRow
              key={r.priority.id}
              priority={r.priority}
              total={r.total}
              ml={r.ml}
              avis={r.avis}
              rank={r.rank}
              mlSuggestions={mlSuggestions}
              avisSuggestions={avisSuggestions}
            />
          ))}
        </AnimatePresence>
        <AddDuringAssign sessionId={state.session.id} nextSortOrder={state.priorities.length} />
      </div>
    </div>
  );
}

function AssignRow({
  priority,
  total,
  ml,
  avis,
  rank,
  mlSuggestions,
  avisSuggestions,
}: {
  priority: VotePriorityRow;
  total: number;
  ml: number;
  avis: number;
  rank: number;
  mlSuggestions: string[];
  avisSuggestions: string[];
}) {
  return (
    <motion.div
      layout
      layoutId={`assign-${priority.id}`}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="rounded-[8px] border-2 border-border bg-white p-5"
    >
      <div className="flex items-baseline gap-4 mb-3">
        <span
          className={`tabular-nums ${
            rank === 1 ? "text-[28px] font-bold text-foreground" :
            rank === 2 ? "text-[24px] font-bold text-foreground/85" :
            rank === 3 ? "text-[22px] font-semibold text-foreground/75" :
            "text-[18px] font-semibold text-grey-700"
          }`}
        >
          #{rank}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className={`leading-snug ${
            rank === 1 ? "text-[22px] font-semibold text-foreground" :
            "text-[18px] font-medium text-foreground"
          }`}>
            {priority.title}
          </h2>
          {priority.description ? (
            <p className="text-[13px] text-grey-700 mt-0.5">{priority.description}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-[28px] font-bold tabular-nums text-foreground">{total}</span>
          <span className="text-[11px] uppercase tracking-wider text-grey-600">votes</span>
        </div>
      </div>

      {/* Vote dots + ML/Avis breakdown */}
      <div className="ml-12 mb-4">
        <VoteDots count={total} />
        <div className="mt-2 flex items-center gap-3 text-[12px] text-grey-800">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
            ML: <span className="font-medium text-foreground">{ml}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#D23C68" }} />
            Avis: <span className="font-medium text-foreground">{avis}</span>
          </span>
        </div>
      </div>

      {/* Assignment fields */}
      <div className="ml-12 grid grid-cols-1 md:grid-cols-2 gap-3">
        <AssignField
          label="ML Owner"
          value={priority.ml_owner ?? ""}
          placeholder="Name of the ML lead"
          suggestions={mlSuggestions}
          onCommit={(v) => updatePriority({ id: priority.id, mlOwner: v.trim() || null })}
        />
        <AssignField
          label="Avis Counterpart"
          value={priority.avis_counterpart ?? ""}
          placeholder="Name of the Avis counterpart"
          suggestions={avisSuggestions}
          onCommit={(v) => updatePriority({ id: priority.id, avisCounterpart: v.trim() || null })}
        />
        <AssignField
          label="Access Needed"
          value={priority.access_needed ?? ""}
          placeholder="What's needed to start"
          onCommit={(v) => updatePriority({ id: priority.id, accessNeeded: v.trim() || null })}
        />
        <AssignField
          label="First Action"
          value={priority.first_action ?? ""}
          placeholder="The first concrete step"
          onCommit={(v) => updatePriority({ id: priority.id, firstAction: v.trim() || null })}
        />
      </div>
    </motion.div>
  );
}

function AssignField({
  label,
  value,
  placeholder,
  suggestions,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  suggestions?: string[];
  onCommit: (v: string) => Promise<void> | void;
}) {
  const [local, setLocal] = useState(value);
  const lastCommittedRef = useRef(value);

  // Keep local in sync when the prop changes due to Realtime updates from a
  // different facilitator browser, but only if we haven't diverged locally.
  useEffect(() => {
    if (local === lastCommittedRef.current) {
      setLocal(value);
      lastCommittedRef.current = value;
    }
  }, [value, local]);

  async function commit() {
    if (local === lastCommittedRef.current) return;
    lastCommittedRef.current = local;
    await onCommit(local);
  }

  const datalistId = suggestions ? `dl-${label.replace(/\s+/g, "-").toLowerCase()}-${Math.random().toString(36).slice(2, 8)}` : undefined;

  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-[2px] text-grey-700">
        {label}
      </span>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder={placeholder}
        list={datalistId}
        className="mt-1 w-full rounded-[4px] border border-border bg-white px-3 py-2 text-[14px] focus:outline-none focus:border-foreground"
      />
      {datalistId && suggestions ? (
        <datalist id={datalistId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}

function VoteDots({ count }: { count: number }) {
  const shown = Math.min(count, 30);
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className="inline-block w-3 h-3 rounded-full bg-deep-blue-800" />
      ))}
      {count > shown ? <span className="text-xs text-grey-700 ml-1">+{count - shown}</span> : null}
    </div>
  );
}

function AddDuringAssign({
  sessionId,
  nextSortOrder,
}: {
  sessionId: string;
  nextSortOrder: number;
}) {
  const [open, setOpen] = useState(false);
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
        isPreloaded: true,
        sortOrder: nextSortOrder,
      });
      setTitle("");
      setDescription("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-[8px] border-2 border-dashed border-grey-300 bg-grey-100 p-4 text-sm text-grey-700 hover:text-foreground hover:border-foreground"
      >
        ➕ Add another priority (0 votes; will sit at the bottom)
      </button>
    );
  }
  return (
    <form
      onSubmit={submit}
      className="rounded-[8px] border-2 border-foreground bg-white p-4 space-y-2"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        placeholder="Title"
        className="w-full rounded-[4px] border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 200))}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-[4px] border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setDescription("");
          }}
          className="h-9 px-3 text-sm rounded-[4px] text-grey-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || busy}
          className="h-9 px-4 text-sm rounded-[4px] bg-deep-blue-800 text-white font-medium disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </form>
  );
}
