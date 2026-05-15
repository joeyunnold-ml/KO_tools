"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import type { LaneState } from "@/lib/useLanes";
import type { Framing, LaneItemRow, LaneSessionRow } from "@/lib/types";
import {
  createItem,
  deleteItem,
  setConfig,
  setFraming,
  updateItem,
} from "@/lib/actions";
import { FRAMING_PRESETS, getFramingPreset, laneColor, teamColor } from "@/lib/palette";

export default function SetupView({
  state,
  token,
  onOpenSession,
  busy,
}: {
  state: LaneState;
  token: string;
  onOpenSession: () => void;
  busy: boolean;
}) {
  if (!state.session) return null;
  const code = state.session.room_code;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join/${code}`;
  const participants = state.participants.filter((p) => !p.is_facilitator);
  const items = [...state.items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 p-6 lg:p-10 bg-white overflow-y-auto">
      {/* Left: items + config */}
      <div className="min-w-0">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
          🛠️ Session setup
        </p>
        <h1 className="text-[28px] font-medium text-foreground mb-1">
          Three-Lane Framework
        </h1>
        <p className="text-[14px] text-grey-700 mb-6">
          Pre-load items, configure the flow, then open the session for participants.
        </p>

        <FramingSection session={state.session} token={token} />

        <hr className="my-8 border-grey-300" />

        <ItemList
          sessionId={state.session.id}
          items={items}
        />

        <hr className="my-8 border-grey-300" />

        <section>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
            ⚙️ Configuration
          </p>
          <ConfigToggle
            checked={state.session.capture_enabled}
            label="Allow participants to submit items (capture phase)"
            description="ON: participants can submit items before sorting. OFF: only your pre-loaded items will be sorted."
            onChange={(v) =>
              setConfig({
                sessionId: state.session!.id,
                facilitatorToken: token,
                captureEnabled: v,
              })
            }
          />
          <ConfigToggle
            checked={state.session.blind_sort_enabled}
            label="Participants sort independently (blind sort)"
            description="ON (recommended): everyone sorts blindly, then AI surfaces consensus & conflict. OFF: facilitator drags items into lanes live with the room."
            onChange={(v) =>
              setConfig({
                sessionId: state.session!.id,
                facilitatorToken: token,
                blindSortEnabled: v,
              })
            }
          />
        </section>
      </div>

      {/* Right: join info */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-[8px] border border-border bg-grey-100 p-5">
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            🔑 Join code
          </p>
          <p className="text-[64px] font-bold tracking-tight text-foreground leading-none">
            {code}
          </p>
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
          onClick={onOpenSession}
          disabled={busy}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-6 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40 transition-colors"
        >
          {busy ? "Opening…" : "▶️ Open session →"}
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

function ItemList({ sessionId, items }: { sessionId: string; items: LaneItemRow[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700">
          📋 Items ({items.length} pre-loaded)
        </p>
      </div>

      <div className="space-y-2 mb-4">
        <AnimatePresence mode="popLayout">
          {items.map((it, i) => (
            <ItemRow key={it.id} item={it} index={i} />
          ))}
        </AnimatePresence>
        {items.length === 0 ? (
          <p className="text-sm text-grey-600 italic py-2">
            No items yet. Add some below — or open the session and let participants submit them.
          </p>
        ) : null}
      </div>

      <AddItemForm sessionId={sessionId} nextSortOrder={items.length} />
    </section>
  );
}

function ItemRow({ item, index }: { item: LaneItemRow; index: number }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [source, setSource] = useState(item.source ?? "");

  async function commit() {
    setEditing(false);
    await updateItem({
      id: item.id,
      title: title.trim() || item.title,
      description: description.trim() || null,
      source: source.trim() || null,
    });
  }

  async function remove() {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await deleteItem(item.id);
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
        <span className="text-sm font-medium text-grey-500 tabular-nums w-6 pt-0.5">
          {index + 1}.
        </span>
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
                placeholder="Description (optional, max 200 chars)"
                rows={2}
                className="w-full rounded-[4px] border border-border px-2 py-1 text-sm focus:outline-none focus:border-foreground resize-none"
              />
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Source (optional, e.g. 'Session 2B')"
                className="w-full rounded-[4px] border border-border px-2 py-1 text-xs focus:outline-none focus:border-foreground"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setTitle(item.title);
                    setDescription(item.description ?? "");
                    setSource(item.source ?? "");
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
              <p className="text-[14px] font-medium text-foreground">{item.title}</p>
              {item.description ? (
                <p className="text-[12px] text-grey-700 mt-0.5">{item.description}</p>
              ) : null}
              {item.source ? (
                <p className="text-[11px] text-grey-600 mt-1 italic">Source: {item.source}</p>
              ) : null}
            </>
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
      </div>
    </motion.div>
  );
}

function FramingSection({
  session,
  token,
}: {
  session: LaneSessionRow;
  token: string;
}) {
  const [framing, setFramingState] = useState<Framing>(session.framing);
  const [labels, setLabels] = useState({
    a: session.lane_a_label,
    aDesc: session.lane_a_description,
    b: session.lane_b_label,
    bDesc: session.lane_b_description,
    c: session.lane_c_label,
    cDesc: session.lane_c_description,
  });

  // Apply a preset (writes to DB immediately).
  async function selectPreset(next: Framing) {
    setFramingState(next);
    if (next === "custom") {
      // For custom, write framing but keep existing labels (or clear if all empty)
      const allEmpty = !labels.a && !labels.b && !labels.c;
      const seed = allEmpty
        ? {
            a: "",
            aDesc: "",
            b: "",
            bDesc: "",
            c: "",
            cDesc: "",
          }
        : labels;
      setLabels(seed);
      await setFraming({
        sessionId: session.id,
        facilitatorToken: token,
        framing: "custom",
        laneALabel: seed.a,
        laneADescription: seed.aDesc,
        laneBLabel: seed.b,
        laneBDescription: seed.bDesc,
        laneCLabel: seed.c,
        laneCDescription: seed.cDesc,
      });
      return;
    }
    const preset = getFramingPreset(next);
    const seed = {
      a: preset.lanes.fix.label,
      aDesc: preset.lanes.fix.description,
      b: preset.lanes.test.label,
      bDesc: preset.lanes.test.description,
      c: preset.lanes.build.label,
      cDesc: preset.lanes.build.description,
    };
    setLabels(seed);
    await setFraming({
      sessionId: session.id,
      facilitatorToken: token,
      framing: next,
      laneALabel: seed.a,
      laneADescription: seed.aDesc,
      laneBLabel: seed.b,
      laneBDescription: seed.bDesc,
      laneCLabel: seed.c,
      laneCDescription: seed.cDesc,
    });
  }

  // Sync local state if session changes via Realtime
  useEffect(() => {
    setFramingState(session.framing);
    setLabels({
      a: session.lane_a_label,
      aDesc: session.lane_a_description,
      b: session.lane_b_label,
      bDesc: session.lane_b_description,
      c: session.lane_c_label,
      cDesc: session.lane_c_description,
    });
  }, [
    session.framing,
    session.lane_a_label,
    session.lane_a_description,
    session.lane_b_label,
    session.lane_b_description,
    session.lane_c_label,
    session.lane_c_description,
  ]);

  async function saveCustomField(field: keyof typeof labels, value: string) {
    const next = { ...labels, [field]: value };
    setLabels(next);
    await setFraming({
      sessionId: session.id,
      facilitatorToken: token,
      framing: "custom",
      laneALabel: next.a,
      laneADescription: next.aDesc,
      laneBLabel: next.b,
      laneBDescription: next.bDesc,
      laneCLabel: next.c,
      laneCDescription: next.cDesc,
    });
  }

  return (
    <section className="mb-6">
      <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
        🎚️ Framing
      </p>
      <div className="rounded-[8px] border border-border bg-grey-100 p-1 inline-flex flex-wrap gap-1 mb-4">
        {FRAMING_PRESETS.map((p) => {
          const active = framing === p.framing;
          return (
            <button
              key={p.framing}
              onClick={() => selectPreset(p.framing)}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-[4px] transition-colors ${
                active ? "bg-white text-foreground shadow-sm" : "text-grey-700 hover:text-foreground"
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <p className="text-[13px] text-grey-700 mb-3">{getFramingPreset(framing).description}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <LaneCard
          laneId="fix"
          label={labels.a}
          description={labels.aDesc}
          editable={framing === "custom"}
          onLabel={(v) => saveCustomField("a", v)}
          onDescription={(v) => saveCustomField("aDesc", v)}
        />
        <LaneCard
          laneId="test"
          label={labels.b}
          description={labels.bDesc}
          editable={framing === "custom"}
          onLabel={(v) => saveCustomField("b", v)}
          onDescription={(v) => saveCustomField("bDesc", v)}
        />
        <LaneCard
          laneId="build"
          label={labels.c}
          description={labels.cDesc}
          editable={framing === "custom"}
          onLabel={(v) => saveCustomField("c", v)}
          onDescription={(v) => saveCustomField("cDesc", v)}
        />
      </div>
    </section>
  );
}

function LaneCard({
  laneId,
  label,
  description,
  editable,
  onLabel,
  onDescription,
}: {
  laneId: "fix" | "test" | "build";
  label: string;
  description: string;
  editable: boolean;
  onLabel: (v: string) => void;
  onDescription: (v: string) => void;
}) {
  const lc = laneColor(laneId);
  const positionLetter = laneId === "fix" ? "A" : laneId === "test" ? "B" : "C";
  return (
    <div
      className="rounded-[8px] border-2 p-3"
      style={{ backgroundColor: lc.bg, borderColor: lc.border }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[2px] mb-1 flex items-center gap-1.5" style={{ color: lc.text }}>
        <span className="inline-block w-5 h-5 rounded-full text-center text-[10px] leading-5 font-bold" style={{ backgroundColor: lc.solid, color: lc.solidFg }}>
          {positionLetter}
        </span>
        Lane {positionLetter}
      </p>
      {editable ? (
        <>
          <input
            value={label}
            onChange={(e) => onLabel(e.target.value.slice(0, 30))}
            placeholder="Label (max 30)"
            className="w-full mb-2 rounded-[4px] border border-border px-2 py-1.5 text-[14px] font-semibold bg-white focus:outline-none focus:border-foreground"
            style={{ color: lc.text }}
          />
          <textarea
            value={description}
            onChange={(e) => onDescription(e.target.value.slice(0, 150))}
            placeholder="Description shown to participants (max 150)"
            rows={3}
            className="w-full rounded-[4px] border border-border px-2 py-1.5 text-[12px] bg-white focus:outline-none focus:border-foreground resize-none"
          />
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold mb-1" style={{ color: lc.text }}>
            {label || "—"}
          </p>
          <p className="text-[12px] leading-snug" style={{ color: lc.text, opacity: 0.85 }}>
            {description || "—"}
          </p>
        </>
      )}
    </div>
  );
}

function AddItemForm({ sessionId, nextSortOrder }: { sessionId: string; nextSortOrder: number }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    try {
      await createItem({
        sessionId,
        title: t,
        description: description.trim() || null,
        source: source.trim() || null,
        isPreloaded: true,
        sortOrder: nextSortOrder,
      });
      setTitle("");
      setDescription("");
      setSource("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[6px] border-2 border-dashed border-grey-300 p-3 space-y-2 bg-grey-100">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        placeholder="+ Add item (title, max 100 chars)"
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
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source (optional, e.g. 'Session 2B')"
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
