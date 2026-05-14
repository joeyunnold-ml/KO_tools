"use client";

import type { SessionState } from "@/lib/useSession";

export default function SubmitView({
  state,
  onAdvance,
  advancing,
  buttonLabel,
}: {
  state: SessionState;
  onAdvance: () => void;
  advancing: boolean;
  buttonLabel: string;
}) {
  const participants = state.participants;
  const submittedParticipantIds = new Set(state.responses.map((r) => r.participant_id));
  const submittedCount = participants.filter((p) => submittedParticipantIds.has(p.id)).length;
  const waiting = participants.filter((p) => !submittedParticipantIds.has(p.id));
  const pct = participants.length ? (submittedCount / participants.length) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
      <div className="max-w-3xl w-full">
        <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-6">
          💭 Prompt
        </p>
        <h1 className="text-[48px] font-bold tracking-tight text-foreground leading-[1.2]">
          ✍️ &ldquo;I&apos;ll consider this engagement a success if ___&rdquo;
        </h1>

        <div className="mt-16">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[22px] font-medium text-foreground">
              📥 {submittedCount} of {participants.length} submitted
            </p>
          </div>
          <div className="h-3 rounded-full bg-grey-200 overflow-hidden">
            <div
              className="h-full bg-deep-blue-800 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {waiting.length > 0 ? (
          <p className="mt-8 text-[18px] text-grey-800">
            ⏳ Waiting: <span className="font-medium text-foreground">{waiting.map((p) => p.name).join(", ")}</span>
          </p>
        ) : (
          <p className="mt-8 text-[18px] text-foreground font-medium">✅ All submissions in.</p>
        )}

        <div className="mt-12">
          <button
            onClick={onAdvance}
            disabled={advancing || state.responses.length === 0}
            className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40"
          >
            {advancing ? "Closing…" : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
