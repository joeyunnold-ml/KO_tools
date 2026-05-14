"use client";

import type { SessionState } from "@/lib/useSession";

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

        {groups.map((g) => {
          const items = state.responses.filter((r) => r.group_id === g.id);
          return (
            <section key={g.id} className="mb-5">
              <h2 className="text-[18px] font-semibold text-foreground mb-2">
                {g.label} <span className="text-grey-600 font-normal">({items.length})</span>
              </h2>
              <ul className="space-y-2">
                {items.map((r) => (
                  <li key={r.id} className="rounded-[8px] bg-white border border-border p-3 text-sm text-foreground">
                    &ldquo;{r.text}&rdquo;
                    <div className="mt-1 text-xs text-grey-700">— {participantsById.get(r.participant_id)?.name ?? "—"}</div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {unclustered.length > 0 ? (
          <section>
            <h2 className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
              📋 Unclustered ({unclustered.length})
            </h2>
            <ul className="space-y-2">
              {unclustered.map((r) => (
                <li key={r.id} className="rounded-[8px] bg-grey-200 border border-border p-3 text-sm text-foreground">
                  &ldquo;{r.text}&rdquo;
                  <div className="mt-1 text-xs text-grey-700">— {participantsById.get(r.participant_id)?.name ?? "—"}</div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
