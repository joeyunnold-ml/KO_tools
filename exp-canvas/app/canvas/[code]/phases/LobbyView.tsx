"use client";

import { QRCodeSVG } from "qrcode.react";
import type { CanvasState } from "@/lib/useCanvas";
import { pillColorForParticipant } from "@/lib/palette";

export default function LobbyView({
  state,
  onStart,
  starting,
}: {
  state: CanvasState;
  onStart: () => void;
  starting: boolean;
}) {
  if (!state.canvas) return null;
  const code = state.canvas.room_code;
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
            📱 go to{" "}
            <span className="font-medium text-foreground">
              {origin.replace(/^https?:\/\//, "")}/join/{code}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-center lg:items-end">
          <div className="bg-white p-6 rounded-[8px] border border-border">
            <QRCodeSVG value={joinUrl} size={300} level="M" fgColor="#000F1E" />
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-[22px] font-medium text-foreground mb-4">
          👥 {participants.length} participant{participants.length === 1 ? "" : "s"} joined
        </p>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const pill = pillColorForParticipant(p.id);
            return (
              <span
                key={p.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-[16px] font-medium"
                style={{ backgroundColor: pill.bg, color: pill.fg }}
              >
                {p.name}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-12 flex justify-end items-center gap-6">
        {!enoughJoined ? (
          <p className="text-base text-grey-700">⏳ Waiting for at least 2 participants…</p>
        ) : null}
        <button
          onClick={onStart}
          disabled={!enoughJoined || starting}
          className="h-[52px] rounded-[4px] bg-deep-blue-800 text-white px-10 text-base font-medium hover:bg-deep-blue-600 disabled:opacity-40 transition-colors"
        >
          {starting ? "Starting…" : "▶️ Start elicitation →"}
        </button>
      </div>
    </div>
  );
}
