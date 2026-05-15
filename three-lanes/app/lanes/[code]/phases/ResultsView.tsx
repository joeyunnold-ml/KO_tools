"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LaneState } from "@/lib/useLanes";
import type { Lane, LaneItemRow } from "@/lib/types";
import { LANES, laneColor, teamColor } from "@/lib/palette";
import { setFinalLane } from "@/lib/actions";
import { downloadMarkdown } from "@/lib/exportMarkdown";

export default function ResultsView({
  state,
  token,
}: {
  state: LaneState;
  token: string;
}) {
  void token;
  if (!state.session) return null;
  const analysis = state.session.analysis_result;
  const items = state.items;
  const participants = state.participants.filter((p) => !p.is_facilitator);
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Contested items the facilitator hasn't placed yet, ranked by AI order
  const contestedQueue = useMemo(() => {
    if (!analysis) return [];
    return analysis.contested
      .map((c) => ({ contested: c, item: itemsById.get(c.item_id) ?? null }))
      .filter((x): x is { contested: typeof analysis.contested[number]; item: LaneItemRow } => !!x.item);
  }, [analysis, itemsById]);

  const unresolved = contestedQueue.filter((x) => !x.item.final_lane);
  const resolved = contestedQueue.filter((x) => !!x.item.final_lane);

  const [contestedIndex, setContestedIndex] = useState(0);
  const current = unresolved[contestedIndex] ?? null;

  async function placeAndAdvance(lane: Lane) {
    if (!current) return;
    await setFinalLane({ id: current.item.id, lane });
    // Index naturally moves to next unresolved as state updates; but if we're at end, stay
    if (contestedIndex >= unresolved.length - 1) {
      setContestedIndex(Math.max(0, unresolved.length - 1));
    }
  }

  function skipNext() {
    setContestedIndex((i) => Math.min(i + 1, Math.max(0, unresolved.length - 1)));
  }
  function skipPrev() {
    setContestedIndex((i) => Math.max(0, i - 1));
  }

  if (!analysis) {
    // Direct discussion fallback (blind sort was OFF) — render the kanban-style board
    return <DirectDiscussionView state={state} />;
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
            ✨ Results
          </p>
          <h1 className="text-[28px] font-medium text-foreground">
            Consensus &amp; conflict
          </h1>
        </div>
        <button
          onClick={() => downloadMarkdown(state)}
          className="h-[44px] rounded-[4px] bg-yellow-500 text-foreground px-6 text-sm font-medium hover:bg-yellow-600"
        >
          📥 Export
        </button>
      </div>

      {/* Patterns callout */}
      {analysis.patterns && analysis.patterns.length > 0 ? (
        <div className="mb-6 rounded-[8px] bg-grey-100 border border-border p-4">
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            🔍 Pattern observations
          </p>
          <ul className="space-y-1 text-[14px] leading-relaxed text-foreground list-disc list-inside">
            {analysis.patterns.map((p, i) => (
              <li key={i}>{p.observation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Consensus row */}
      <section className="mb-8">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
          ✅ Consensus ({analysis.consensus.length} item{analysis.consensus.length === 1 ? "" : "s"})
        </p>
        {analysis.consensus.length === 0 ? (
          <p className="text-sm text-grey-700 italic">No items reached consensus — every item is contested.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {analysis.consensus.map((c) => {
              const item = itemsById.get(c.item_id);
              if (!item) return null;
              const lc = laneColor(c.lane);
              return (
                <div
                  key={c.item_id}
                  className="rounded-[6px] border-2 px-3 py-2 max-w-xs"
                  style={{ backgroundColor: lc.bg, borderColor: lc.border }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ backgroundColor: lc.solid, color: lc.solidFg }}
                    >
                      {lc.emoji} {lc.label}
                    </span>
                    <span className="text-[10px] text-grey-700">{Math.round(c.agreement_pct)}%</span>
                  </div>
                  <p className="text-[13px] font-medium text-foreground leading-snug">{item.title}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Contested card stack */}
      {unresolved.length > 0 || resolved.length > 0 ? (
        <section className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700">
              🤝 Contested — {unresolved.length} remaining · {resolved.length} placed
            </p>
            {unresolved.length > 0 ? (
              <div className="flex items-center gap-2 text-xs text-grey-700">
                <button onClick={skipPrev} disabled={contestedIndex === 0} className="px-2 py-1 hover:text-foreground disabled:opacity-30">
                  ← prev
                </button>
                <span>
                  {contestedIndex + 1} of {unresolved.length}
                </span>
                <button onClick={skipNext} disabled={contestedIndex >= unresolved.length - 1} className="px-2 py-1 hover:text-foreground disabled:opacity-30">
                  next →
                </button>
              </div>
            ) : null}
          </div>

          {current ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={current.item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="rounded-[8px] border-2 border-foreground bg-white p-6"
              >
                <h2 className="text-[22px] font-semibold text-foreground mb-1">
                  &ldquo;{current.item.title}&rdquo;
                </h2>
                {current.item.description ? (
                  <p className="text-[14px] text-grey-700 mb-4">{current.item.description}</p>
                ) : null}

                <div className="grid grid-cols-3 gap-4 mb-4">
                  {LANES.map((lane) => (
                    <VoteBar
                      key={lane}
                      lane={lane}
                      distribution={current.contested.distribution}
                      itemId={current.item.id}
                      classifications={state.classifications}
                      participantsById={participantsById}
                    />
                  ))}
                </div>

                <div className="rounded-[6px] bg-yellow-500/20 border border-yellow-500 px-4 py-3 mb-5">
                  <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
                    💬 Discussion prompt
                  </p>
                  <p className="text-[15px] leading-relaxed text-foreground">
                    {current.contested.discussion_prompt}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {LANES.map((lane) => {
                    const lc = laneColor(lane);
                    return (
                      <button
                        key={lane}
                        onClick={() => placeAndAdvance(lane)}
                        className="flex-1 min-w-[140px] h-[48px] rounded-[4px] text-sm font-medium border-2 hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: lc.solid,
                          color: lc.solidFg,
                          borderColor: lc.solid,
                        }}
                      >
                        {lc.emoji} Place in {lc.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : unresolved.length === 0 && resolved.length > 0 ? (
            <div className="rounded-[8px] border border-border bg-grey-100 p-6 text-center">
              <p className="text-[18px] font-medium text-foreground">🎉 All contested items placed.</p>
              <p className="text-[14px] text-grey-700 mt-1">Export the results when you&apos;re ready.</p>
            </div>
          ) : (
            <div className="rounded-[8px] border border-border bg-grey-100 p-6 text-center">
              <p className="text-[18px] font-medium text-foreground">✨ Strong alignment</p>
              <p className="text-[14px] text-grey-700 mt-1">No contested items — the team agreed on everything.</p>
            </div>
          )}

          {/* Resolved chips */}
          {resolved.length > 0 ? (
            <div className="mt-6">
              <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
                ✓ Placed
              </p>
              <div className="flex flex-wrap gap-2">
                {resolved.map(({ item }) => {
                  const lc = item.final_lane ? laneColor(item.final_lane) : null;
                  return lc ? (
                    <button
                      key={item.id}
                      onClick={() => setFinalLane({ id: item.id, lane: null })}
                      className="rounded-[6px] border-2 px-3 py-1.5 text-xs hover:opacity-80"
                      style={{ backgroundColor: lc.bg, borderColor: lc.border, color: lc.text }}
                      title="Click to unplace"
                    >
                      <span className="font-semibold mr-1">{lc.emoji} {lc.label}</span>
                      {item.title}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function VoteBar({
  lane,
  distribution,
  itemId,
  classifications,
  participantsById,
}: {
  lane: Lane;
  distribution: { fix: number; test: number; build: number };
  itemId: string;
  classifications: LaneState["classifications"];
  participantsById: Map<string, { team: "monstarlab" | "avis"; name: string; id: string }>;
}) {
  const lc = laneColor(lane);
  const count = distribution[lane];
  const total = distribution.fix + distribution.test + distribution.build;
  const pct = total > 0 ? (count / total) * 100 : 0;

  // Team breakdown for this lane on this item
  const inLane = classifications.filter((c) => c.item_id === itemId && c.lane === lane);
  let ml = 0;
  let avis = 0;
  for (const c of inLane) {
    const p = participantsById.get(c.participant_id);
    if (p?.team === "monstarlab") ml++;
    else if (p?.team === "avis") avis++;
  }

  return (
    <div className="rounded-[6px] border-2 p-3" style={{ backgroundColor: lc.bg, borderColor: lc.border }}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-semibold" style={{ color: lc.text }}>
          {lc.emoji} {lc.label}
        </span>
        <span className="text-[22px] font-bold tabular-nums" style={{ color: lc.text }}>
          {count}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white overflow-hidden">
        <motion.div
          className="h-full"
          style={{ backgroundColor: lc.solid }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 24 }}
        />
      </div>
      <div className="mt-2 flex gap-3 text-[11px] text-grey-800">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: teamColor("monstarlab").bg }} />
          ML: <span className="font-medium text-foreground">{ml}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: teamColor("avis").bg }} />
          Avis: <span className="font-medium text-foreground">{avis}</span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Direct Discussion view — fallback when blind sort was disabled.
// Three columns + an unsorted bin. Facilitator drags items into lanes.
// ---------------------------------------------------------------------------
function DirectDiscussionView({ state }: { state: LaneState }) {
  const items = state.items;
  const unsorted = items.filter((i) => !i.final_lane);
  const byLane: Record<Lane, typeof items> = {
    fix: items.filter((i) => i.final_lane === "fix"),
    test: items.filter((i) => i.final_lane === "test"),
    build: items.filter((i) => i.final_lane === "build"),
  };

  async function placeItem(itemId: string, lane: Lane | null) {
    await setFinalLane({ id: itemId, lane });
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
            🗂️ Direct discussion
          </p>
          <h1 className="text-[28px] font-medium text-foreground">
            Sort items into lanes
          </h1>
          <p className="text-[14px] text-grey-700 mt-1">
            Click an item to place it. Click the lane chip again to remove.
          </p>
        </div>
        <button
          onClick={() => downloadMarkdown(state)}
          className="h-[44px] rounded-[4px] bg-yellow-500 text-foreground px-6 text-sm font-medium hover:bg-yellow-600"
        >
          📥 Export
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {LANES.map((lane) => {
          const lc = laneColor(lane);
          return (
            <div
              key={lane}
              className="rounded-[8px] border-2 p-4 min-h-[200px]"
              style={{ backgroundColor: lc.bg, borderColor: lc.border }}
            >
              <p className="text-[14px] font-semibold mb-3" style={{ color: lc.text }}>
                {lc.emoji} {lc.label} ({byLane[lane].length})
              </p>
              <div className="space-y-2">
                {byLane[lane].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => placeItem(item.id, null)}
                    className="w-full rounded-[6px] border border-border bg-white p-3 text-left hover:opacity-80"
                  >
                    <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                    {item.description ? (
                      <p className="text-[11px] text-grey-700 mt-0.5">{item.description}</p>
                    ) : null}
                  </button>
                ))}
                {byLane[lane].length === 0 ? (
                  <p className="text-xs text-grey-600 italic">empty</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
          📋 Unsorted ({unsorted.length})
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {unsorted.map((item) => (
            <div key={item.id} className="rounded-[6px] border border-border bg-white p-3">
              <p className="text-[13px] font-medium text-foreground mb-2">{item.title}</p>
              {item.description ? (
                <p className="text-[11px] text-grey-700 mb-2">{item.description}</p>
              ) : null}
              <div className="flex gap-1.5">
                {LANES.map((lane) => {
                  const lc = laneColor(lane);
                  return (
                    <button
                      key={lane}
                      onClick={() => placeItem(item.id, lane)}
                      className="flex-1 h-7 rounded-[4px] text-[11px] font-medium border-2 hover:opacity-90"
                      style={{ backgroundColor: lc.solid, color: lc.solidFg, borderColor: lc.solid }}
                    >
                      {lc.emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {unsorted.length === 0 ? (
            <p className="text-xs text-grey-600 italic md:col-span-3">All items placed.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
