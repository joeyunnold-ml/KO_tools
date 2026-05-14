"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import { downloadMarkdown } from "@/lib/exportMarkdown";
import { paletteFor } from "@/lib/palette";
import { VoteDots } from "./VoteView";
import ResponsePill from "@/components/ResponsePill";

export default function ResultsView({ state }: { state: SessionState }) {
  const groups = state.groups;
  const participantsById = useMemo(() => {
    const m = new Map(state.participants.map((p) => [p.id, p]));
    return m;
  }, [state.participants]);

  const ranked = useMemo(() => {
    return [...groups]
      .map((g) => {
        const total = state.votes.filter((v) => v.group_id === g.id).length;
        return { group: g, total, originalIndex: g.sort_order };
      })
      .sort((a, b) => b.total - a.total);
  }, [groups, state.votes]);

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[28px] font-medium text-foreground">
          🏆 Priorities <span className="text-grey-600 text-base font-normal">(ranked by votes)</span>
        </h1>
        <button
          onClick={() => downloadMarkdown(state)}
          className="h-[44px] rounded-[4px] bg-yellow-500 text-foreground px-6 text-sm font-medium hover:bg-yellow-600"
        >
          📥 Export results
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {ranked.map((r, i) => {
          const palette = paletteFor(r.originalIndex);
          const responses = state.responses.filter((rsp) => rsp.group_id === r.group.id);
          return (
            <ResultRow
              key={r.group.id}
              rank={i}
              label={r.group.label}
              total={r.total}
              palette={palette}
              responses={responses}
              participantsById={participantsById}
            />
          );
        })}
      </div>
    </div>
  );
}

function ResultRow({
  rank,
  label,
  total,
  palette,
  responses,
  participantsById,
}: {
  rank: number;
  label: string;
  total: number;
  palette: ReturnType<typeof paletteFor>;
  responses: ReturnType<SessionState["responses"]["filter"]>;
  participantsById: Map<string, { name: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const medal = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`;

  return (
    <motion.div
      layout
      className="rounded-[8px] border-2 p-6"
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-baseline gap-4 mb-3">
          <span className="text-[28px] font-bold tabular-nums w-14" style={{ color: palette.text }}>
            {medal}
          </span>
          <h2 className="text-[22px] font-medium flex-1" style={{ color: palette.text }}>
            {label}
          </h2>
          <span className="text-[28px] font-bold tabular-nums" style={{ color: palette.text }}>
            {total}
          </span>
          <span className="text-grey-500 text-xs">{expanded ? "▾" : "▸"}</span>
        </div>
      </button>
      <div className="pl-14">
        <VoteDots count={total} color={palette.text} />
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {responses.map((r) => {
                  const p = participantsById.get(r.participant_id);
                  return (
                    <ResponsePill
                      key={r.id}
                      response={r}
                      participantName={p?.name ?? "—"}
                      participantId={r.participant_id}
                      palette={palette}
                      compact
                    />
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
