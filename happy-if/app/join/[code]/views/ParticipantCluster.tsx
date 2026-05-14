"use client";

import { motion, AnimatePresence } from "motion/react";
import type { SessionState } from "@/lib/useSession";
import { paletteFor } from "@/lib/palette";
import ResponsePill from "@/components/ResponsePill";

export default function ParticipantCluster({
  state,
  participantId,
}: {
  state: SessionState;
  participantId: string;
}) {
  void participantId;
  const groups = [...state.groups].sort((a, b) => a.sort_order - b.sort_order);
  const unclustered = state.responses.filter((r) => r.group_id === null);
  const participantsById = new Map(state.participants.map((p) => [p.id, p]));

  return (
    <main className="flex-1 flex flex-col p-4 bg-grey-100">
      <div className="max-w-md mx-auto w-full">
        <h1 className="text-[22px] font-medium mb-1 text-foreground">🗂️ Grouping responses</h1>
        <p className="text-sm text-grey-700 mb-6">👀 Follow along with the facilitator.</p>

        <AnimatePresence mode="popLayout">
          {groups.map((g, idx) => {
            const palette = paletteFor(idx);
            const items = state.responses.filter((r) => r.group_id === g.id);
            return (
              <motion.section
                key={g.id}
                layout
                layoutId={`p-group-${g.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 22 }}
                className="mb-4 rounded-[8px] border-2 p-4"
                style={{ backgroundColor: palette.bg, borderColor: palette.border }}
              >
                <h2 className="text-[16px] font-semibold mb-3" style={{ color: palette.text }}>
                  {g.label}{" "}
                  <span className="opacity-50 font-normal">({items.length})</span>
                </h2>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {items.map((r) => {
                      const p = participantsById.get(r.participant_id);
                      return (
                        <motion.div
                          key={r.id}
                          layout
                          layoutId={`p-response-${r.id}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        >
                          <ResponsePill
                            response={r}
                            participantName={p?.name ?? "—"}
                            participantId={r.participant_id}
                            palette={palette}
                            compact
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.section>
            );
          })}
        </AnimatePresence>

        {unclustered.length > 0 ? (
          <section className="mt-2">
            <h2 className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
              📋 Unclustered ({unclustered.length})
            </h2>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {unclustered.map((r) => {
                  const p = participantsById.get(r.participant_id);
                  return (
                    <motion.div
                      key={r.id}
                      layout
                      layoutId={`p-response-${r.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    >
                      <ResponsePill
                        response={r}
                        participantName={p?.name ?? "—"}
                        participantId={r.participant_id}
                        compact
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
