"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { LaneState } from "@/lib/useLanes";
import { LANES, laneColor, teamColor } from "@/lib/palette";

export default function ParticipantResults({
  state,
  participantId,
}: {
  state: LaneState;
  participantId: string;
}) {
  void participantId;
  if (!state.session) return null;
  const analysis = state.session.analysis_result;
  const items = state.items;
  const participants = state.participants.filter((p) => !p.is_facilitator);
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  if (!analysis) {
    // Direct discussion fallback — just show the board as a read-only view
    return (
      <main className="flex-1 flex flex-col p-4 md:p-8 bg-grey-100">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
            🗂️ Direct discussion
          </p>
          <h1 className="text-[22px] md:text-[28px] font-medium text-foreground mb-5">
            Lanes
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {LANES.map((lane) => {
              const lc = laneColor(lane);
              const inLane = items.filter((i) => i.final_lane === lane);
              return (
                <div
                  key={lane}
                  className="rounded-[8px] border-2 p-4"
                  style={{ backgroundColor: lc.bg, borderColor: lc.border }}
                >
                  <p className="text-[14px] font-semibold mb-3" style={{ color: lc.text }}>
                    {lc.emoji} {lc.label} ({inLane.length})
                  </p>
                  <ul className="space-y-1.5">
                    {inLane.map((i) => (
                      <li key={i.id} className="text-[13px] text-foreground rounded-[4px] bg-white border border-border px-2 py-1.5">
                        {i.title}
                      </li>
                    ))}
                    {inLane.length === 0 ? <li className="text-[11px] text-grey-600 italic">empty</li> : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 bg-grey-100">
      <div className="max-w-5xl mx-auto w-full">
        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
          ✨ Results
        </p>
        <h1 className="text-[22px] md:text-[28px] font-medium text-foreground mb-5">
          Consensus &amp; conflict
        </h1>

        {analysis.patterns && analysis.patterns.length > 0 ? (
          <div className="mb-6 rounded-[8px] bg-white border border-border p-4">
            <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
              🔍 Patterns
            </p>
            <ul className="space-y-1 text-[13px] leading-relaxed text-foreground list-disc list-inside">
              {analysis.patterns.map((p, i) => (
                <li key={i}>{p.observation}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="mb-6">
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            ✅ Consensus
          </p>
          {analysis.consensus.length === 0 ? (
            <p className="text-sm text-grey-700 italic">No consensus — every item is contested.</p>
          ) : (
            <div className="space-y-1.5">
              {analysis.consensus.map((c) => {
                const item = itemsById.get(c.item_id);
                if (!item) return null;
                const lc = laneColor(c.lane);
                return (
                  <div
                    key={c.item_id}
                    className="rounded-[6px] border-2 px-3 py-2 flex items-center gap-2"
                    style={{ backgroundColor: lc.bg, borderColor: lc.border }}
                  >
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                      style={{ backgroundColor: lc.solid, color: lc.solidFg }}
                    >
                      {lc.emoji}
                    </span>
                    <span className="text-[13px] font-medium text-foreground">{item.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            🤝 Contested
          </p>
          <div className="space-y-3">
            {analysis.contested.map((c) => {
              const item = itemsById.get(c.item_id);
              if (!item) return null;
              const totalVotes = c.distribution.fix + c.distribution.test + c.distribution.build;
              return (
                <motion.div
                  key={c.item_id}
                  layout
                  className="rounded-[8px] bg-white border border-border p-4"
                >
                  <p className="text-[14px] font-medium text-foreground leading-snug">{item.title}</p>
                  {item.final_lane ? (
                    <div className="mt-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: laneColor(item.final_lane).solid,
                          color: laneColor(item.final_lane).solidFg,
                        }}
                      >
                        Placed: {laneColor(item.final_lane).emoji} {laneColor(item.final_lane).label}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {LANES.map((lane) => {
                      const lc = laneColor(lane);
                      const count = c.distribution[lane];
                      const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                      const inLane = state.classifications.filter(
                        (cl) => cl.item_id === c.item_id && cl.lane === lane,
                      );
                      let ml = 0;
                      let avis = 0;
                      for (const cl of inLane) {
                        const p = participantsById.get(cl.participant_id);
                        if (p?.team === "monstarlab") ml++;
                        else if (p?.team === "avis") avis++;
                      }
                      return (
                        <div
                          key={lane}
                          className="rounded-[4px] border p-2"
                          style={{ backgroundColor: lc.bg, borderColor: lc.border }}
                        >
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-[11px] font-semibold" style={{ color: lc.text }}>
                              {lc.emoji} {lc.label}
                            </span>
                            <span className="text-[14px] font-bold tabular-nums" style={{ color: lc.text }}>
                              {count}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white overflow-hidden">
                            <div
                              className="h-full"
                              style={{ backgroundColor: lc.solid, width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-1 flex gap-2 text-[10px] text-grey-800">
                            <span className="flex items-center gap-0.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teamColor("monstarlab").bg }} />
                              {ml}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teamColor("avis").bg }} />
                              {avis}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[12px] text-grey-700 italic leading-relaxed">
                    💬 {c.discussion_prompt}
                  </p>
                </motion.div>
              );
            })}
            {analysis.contested.length === 0 ? (
              <p className="text-sm text-grey-700 italic">Strong alignment — nothing contested.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

