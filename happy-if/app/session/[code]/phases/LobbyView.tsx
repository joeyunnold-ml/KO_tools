"use client";

import { QRCodeSVG } from "qrcode.react";
import type { SessionState } from "@/lib/useSession";

export default function LobbyView({
  state,
  onAdvance,
  advancing,
}: {
  state: SessionState;
  onAdvance: () => void;
  advancing: boolean;
}) {
  if (!state.session) return null;
  const code = state.session.room_code;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join/${code}`;
  const participants = state.participants;
  const enoughJoined = participants.length >= 2;

  return (
    <div className="flex-1 flex flex-col p-12 bg-white">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-4">
            🔑 Join code
          </p>
          <div className="text-[180px] leading-[0.95] font-bold tracking-tight text-foreground">
            {code}
          </div>
          <p className="mt-8 text-[22px] text-grey-800">
            📱 go to <span className="font-medium text-foreground">{origin.replace(/^https?:\/\//, "")}/join/{code}</span>
          </p>
        </div>

        <div className="flex flex-col items-center lg:items-end">
          <div className="bg-white p-6 rounded-[8px] border border-border">
            <QRCodeSVG value={joinUrl} size={300} level="M" fgColor="#000F1E" />
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <div className="flex items-baseline gap-4 mb-4">
          <p className="text-[22px] font-medium text-foreground">
            👥 {participants.length} of ~12 participants joined
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {participants.map((p) => (
            <span key={p.id} className="text-[18px] text-foreground flex items-center gap-2.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: p.team === "monstarlab" ? "var(--team-monstarlab)" : "var(--team-avis)" }}
              />
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-12 flex justify-end items-center gap-6">
        {!enoughJoined ? (
          <p className="text-base text-grey-700">⏳ Waiting for at least 2 participants…</p>
        ) : null}
        <button
          onClick={onAdvance}
          disabled={!enoughJoined || advancing}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40 transition-colors"
        >
          {advancing ? "⏳ Starting…" : "▶️ Begin submissions →"}
        </button>
      </div>
    </div>
  );
}
