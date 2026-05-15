"use client";

import { useMemo } from "react";
import type { VoteState } from "@/lib/useVotes";
import { buildRanking } from "@/lib/ranking";
import { downloadMarkdown } from "@/lib/exportMarkdown";

export default function ReadOnlyView({ state }: { state: VoteState }) {
  if (!state.session) return null;
  const ranked = useMemo(() => buildRanking(state), [state]);
  const phase = state.session.phase;
  const isLive = phase === "vote" || phase === "assign";
  const isComplete = phase === "complete";

  // If voting hasn't happened yet, show a "joining is happening" message
  if (phase === "setup" || phase === "lobby" || phase === "capture") {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center bg-grey-100">
        <div className="max-w-md">
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">
            ⏳ Session in progress
          </p>
          <h1 className="text-[24px] font-medium text-foreground mb-2">
            The room is setting up
          </h1>
          <p className="text-grey-800">
            Check back when voting opens. Or join with{" "}
            <a className="underline" href={`/join/${state.session.room_code}`}>/join/{state.session.room_code}</a>{" "}
            on your phone.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-10 bg-white">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
            {isComplete ? "📌 Commitment table" : isLive ? "🔴 Live" : "🏆 Priorities"}
          </p>
          <h1 className="text-[28px] font-medium text-foreground">
            Week 1-2 priorities
          </h1>
        </div>
        <button
          onClick={() => downloadMarkdown(state)}
          className="h-[40px] rounded-[4px] bg-yellow-500 text-foreground px-4 text-sm font-medium hover:bg-yellow-600"
        >
          📥 Export Markdown
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-w-5xl">
        {ranked.map((r) => (
          <div
            key={r.priority.id}
            className="rounded-[8px] border-2 border-border bg-white p-5"
          >
            <div className="flex items-baseline gap-4 mb-3">
              <span
                className={`tabular-nums ${
                  r.rank === 1 ? "text-[28px] font-bold text-foreground" :
                  r.rank === 2 ? "text-[24px] font-bold text-foreground/85" :
                  r.rank === 3 ? "text-[22px] font-semibold text-foreground/75" :
                  "text-[18px] font-semibold text-grey-700"
                }`}
              >
                #{r.rank}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className={`leading-snug ${
                  r.rank === 1 ? "text-[22px] font-semibold text-foreground" :
                  "text-[18px] font-medium text-foreground"
                }`}>
                  {r.priority.title}
                </h2>
                {r.priority.description ? (
                  <p className="text-[13px] text-grey-700 mt-0.5">{r.priority.description}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-[28px] font-bold tabular-nums text-foreground">{r.total}</span>
                <span className="text-[11px] uppercase tracking-wider text-grey-600">votes</span>
              </div>
            </div>

            <div className="ml-12">
              <div className="flex items-center gap-3 text-[12px] text-grey-800 mb-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
                  ML: <span className="font-medium text-foreground">{r.ml}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#D23C68" }} />
                  Avis: <span className="font-medium text-foreground">{r.avis}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Field label="ML Owner" value={r.priority.ml_owner} />
                <Field label="Avis Counterpart" value={r.priority.avis_counterpart} />
                <Field label="Access Needed" value={r.priority.access_needed} />
                <Field label="First Action" value={r.priority.first_action} />
              </div>
            </div>
          </div>
        ))}
        {ranked.length === 0 ? (
          <p className="text-grey-600 italic">No priorities.</p>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[4px] bg-grey-100 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[2px] text-grey-700">{label}</p>
      <p className="text-[14px] text-foreground mt-0.5">
        {value && value.trim() ? value : <span className="text-grey-500 italic">—</span>}
      </p>
    </div>
  );
}
