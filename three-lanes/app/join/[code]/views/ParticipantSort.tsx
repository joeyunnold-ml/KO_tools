"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LaneState } from "@/lib/useLanes";
import type { Lane, LaneItemRow } from "@/lib/types";
import { LANES, laneColor } from "@/lib/palette";
import { classify } from "@/lib/actions";
import { useIsTabletPlus } from "@/lib/useMediaQuery";

const AUTO_ADVANCE_MS = 280;

export default function ParticipantSort({
  state,
  participantId,
}: {
  state: LaneState;
  participantId: string;
}) {
  const items = useMemo(
    () => [...state.items].sort((a, b) => a.sort_order - b.sort_order),
    [state.items],
  );
  const myClassifications = useMemo(() => {
    const m = new Map<string, Lane>();
    for (const c of state.classifications) {
      if (c.participant_id === participantId) m.set(c.item_id, c.lane);
    }
    return m;
  }, [state.classifications, participantId]);

  const isTabletPlus = useIsTabletPlus();

  // Active index — first unsorted item by default
  const firstUnsortedIdx = items.findIndex((it) => !myClassifications.has(it.id));
  const [activeIdx, setActiveIdx] = useState(firstUnsortedIdx === -1 ? 0 : firstUnsortedIdx);

  useEffect(() => {
    // If items list grows or shrinks, clamp index
    if (activeIdx >= items.length) setActiveIdx(Math.max(0, items.length - 1));
  }, [items.length, activeIdx]);

  const total = items.length;
  const done = myClassifications.size;
  const allSorted = done >= total && total > 0;

  if (items.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center bg-grey-100">
        <p className="text-grey-700">No items to sort yet.</p>
      </main>
    );
  }

  const activeItem = items[activeIdx];
  if (!activeItem) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center bg-grey-100">
        <p className="text-grey-700">Loading…</p>
      </main>
    );
  }

  async function pickLane(lane: Lane) {
    if (!state.session) return;
    await classify({
      sessionId: state.session.id,
      itemId: activeItem.id,
      participantId,
      lane,
    });
    // Auto-advance to next unsorted (or next item if all sorted)
    setTimeout(() => {
      const updatedDone = new Set([...myClassifications.keys(), activeItem.id]);
      const nextUnsorted = items.findIndex((it, i) => i > activeIdx && !updatedDone.has(it.id));
      if (nextUnsorted !== -1) {
        setActiveIdx(nextUnsorted);
        return;
      }
      // Wrap around to find any unsorted earlier in the list
      const anyUnsorted = items.findIndex((it) => !updatedDone.has(it.id));
      if (anyUnsorted !== -1) {
        setActiveIdx(anyUnsorted);
      } else if (activeIdx < items.length - 1) {
        setActiveIdx(activeIdx + 1);
      }
    }, AUTO_ADVANCE_MS);
  }

  const sidebar = isTabletPlus ? (
    <SortSidebar
      items={items}
      myClassifications={myClassifications}
      activeIdx={activeIdx}
      onPick={setActiveIdx}
    />
  ) : null;

  return (
    <main className="flex-1 flex flex-col md:flex-row bg-grey-100">
      {/* Sidebar (desktop only) */}
      {sidebar}

      {/* Main card area */}
      <div className="flex-1 flex flex-col p-4 md:p-8 min-w-0">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700">
              Item {activeIdx + 1} of {total}
            </p>
            <p className="text-[12px] text-grey-700">
              <span className="font-medium text-foreground">{done}</span> / {total} sorted
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-grey-200 overflow-hidden mb-6">
            <motion.div
              className="h-full bg-deep-blue-800"
              animate={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="rounded-[8px] bg-white border border-border p-5 mb-6 flex-1 min-h-[160px]"
            >
              <p className="text-[18px] md:text-[22px] font-medium text-foreground leading-snug">
                {activeItem.title}
              </p>
              {activeItem.description ? (
                <p className="mt-2 text-[14px] text-grey-700 leading-relaxed">
                  {activeItem.description}
                </p>
              ) : null}
              {activeItem.source ? (
                <p className="mt-3 text-[11px] text-grey-600 italic">Source: {activeItem.source}</p>
              ) : null}
              {myClassifications.has(activeItem.id) ? (
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wider text-grey-600 mb-1">
                    Your current pick
                  </p>
                  <CurrentLaneChip lane={myClassifications.get(activeItem.id)!} />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {/* Lane buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {LANES.map((lane) => {
              const lc = laneColor(lane);
              const isSelected = myClassifications.get(activeItem.id) === lane;
              return (
                <button
                  key={lane}
                  onClick={() => pickLane(lane)}
                  className={`h-[80px] md:h-[96px] rounded-[8px] border-2 text-sm font-semibold transition-all active:scale-95 ${
                    isSelected ? "ring-2 ring-foreground ring-offset-2" : ""
                  }`}
                  style={{
                    backgroundColor: lc.solid,
                    color: lc.solidFg,
                    borderColor: lc.solid,
                  }}
                >
                  <div className="text-2xl">{lc.emoji}</div>
                  <div className="mt-0.5 text-[12px] uppercase tracking-wider">{lc.label}</div>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center text-sm">
            <button
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              className="text-grey-700 hover:text-foreground disabled:opacity-30"
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveIdx((i) => Math.min(items.length - 1, i + 1))}
              disabled={activeIdx === items.length - 1}
              className="text-grey-700 hover:text-foreground disabled:opacity-30"
            >
              Next →
            </button>
          </div>

          {allSorted ? (
            <div className="mt-6 rounded-[8px] bg-white border-2 px-4 py-3 text-center" style={{ borderColor: "var(--success-fg)" }}>
              <p className="text-[14px] font-medium" style={{ color: "var(--success-fg)" }}>
                ✅ All sorted!
              </p>
              <p className="text-[12px] text-grey-700 mt-1">
                You can change any classification by tapping a different lane. Waiting for the facilitator…
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function CurrentLaneChip({ lane }: { lane: Lane }) {
  const lc = laneColor(lane);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-semibold"
      style={{ backgroundColor: lc.solid, color: lc.solidFg }}
    >
      {lc.emoji} {lc.label}
    </span>
  );
}

function SortSidebar({
  items,
  myClassifications,
  activeIdx,
  onPick,
}: {
  items: LaneItemRow[];
  myClassifications: Map<string, Lane>;
  activeIdx: number;
  onPick: (i: number) => void;
}) {
  // Group items by lane
  const byLane: Record<Lane, Array<{ item: LaneItemRow; idx: number }>> = {
    fix: [],
    test: [],
    build: [],
  };
  const unsorted: Array<{ item: LaneItemRow; idx: number }> = [];
  items.forEach((item, idx) => {
    const lane = myClassifications.get(item.id);
    if (lane) byLane[lane].push({ item, idx });
    else unsorted.push({ item, idx });
  });

  return (
    <aside className="w-[300px] flex-shrink-0 border-r border-border bg-white p-4 overflow-y-auto">
      <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
        Your sort
      </p>
      <Section title={`📋 Unsorted (${unsorted.length})`} items={unsorted} activeIdx={activeIdx} onPick={onPick} />
      {LANES.map((lane) => {
        const lc = laneColor(lane);
        return (
          <SectionLane
            key={lane}
            lane={lane}
            items={byLane[lane]}
            activeIdx={activeIdx}
            onPick={onPick}
            color={lc}
          />
        );
      })}
    </aside>
  );
}

function Section({
  title,
  items,
  activeIdx,
  onPick,
}: {
  title: string;
  items: Array<{ item: LaneItemRow; idx: number }>;
  activeIdx: number;
  onPick: (i: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-4">
      <p className="text-[11px] font-semibold text-grey-700 mb-1.5">{title}</p>
      <div className="space-y-1">
        {items.map(({ item, idx }) => (
          <button
            key={item.id}
            onClick={() => onPick(idx)}
            className={`w-full text-left rounded-[4px] px-2 py-1.5 text-[12px] transition-colors ${
              activeIdx === idx ? "bg-deep-blue-800 text-white" : "bg-grey-100 text-foreground hover:bg-grey-200"
            }`}
          >
            <span className="opacity-60 tabular-nums">{idx + 1}.</span>{" "}
            {item.title.length > 38 ? item.title.slice(0, 38) + "…" : item.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function SectionLane({
  lane,
  items,
  activeIdx,
  onPick,
  color,
}: {
  lane: Lane;
  items: Array<{ item: LaneItemRow; idx: number }>;
  activeIdx: number;
  onPick: (i: number) => void;
  color: ReturnType<typeof laneColor>;
}) {
  void lane;
  return (
    <section className="mb-4">
      <p className="text-[11px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: color.text }}>
        <span>{color.emoji}</span>
        <span>{color.label} ({items.length})</span>
      </p>
      <div className="space-y-1">
        {items.map(({ item, idx }) => (
          <button
            key={item.id}
            onClick={() => onPick(idx)}
            className={`w-full text-left rounded-[4px] px-2 py-1.5 text-[12px] transition-colors border ${
              activeIdx === idx ? "border-foreground" : "border-transparent"
            }`}
            style={{
              backgroundColor: color.bg,
              color: color.text,
            }}
          >
            <span className="opacity-60 tabular-nums">{idx + 1}.</span>{" "}
            {item.title.length > 38 ? item.title.slice(0, 38) + "…" : item.title}
          </button>
        ))}
        {items.length === 0 ? <p className="text-[11px] text-grey-600 italic px-2">none yet</p> : null}
      </div>
    </section>
  );
}
