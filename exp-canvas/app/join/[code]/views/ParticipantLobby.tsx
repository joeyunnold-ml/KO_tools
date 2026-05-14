"use client";

import type { CanvasState } from "@/lib/useCanvas";

export default function ParticipantLobby({
  state,
  participantId,
}: {
  state: CanvasState;
  participantId: string;
}) {
  const me = state.participants.find((p) => p.id === participantId);
  const realParticipants = state.participants.filter((p) => !p.is_facilitator);
  return (
    <main className="flex-1 flex items-center justify-center p-6 text-center bg-grey-100">
      <div className="max-w-sm">
        <div className="text-grey-600 text-[12px] font-medium uppercase tracking-[2px] mb-3 animate-pulse">
          ⏳ Waiting…
        </div>
        <h1 className="text-[28px] font-medium text-foreground mb-3">
          🎉 You&apos;re in, {me?.name}.
        </h1>
        <p className="text-base text-grey-800">
          👥 {realParticipants.length} {realParticipants.length === 1 ? "person" : "people"} joined.
          The facilitator will start shortly.
        </p>
      </div>
    </main>
  );
}
