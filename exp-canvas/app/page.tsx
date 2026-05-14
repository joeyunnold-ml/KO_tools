"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveFacilitatorToken, saveFacilitatorParticipantId } from "@/lib/storage";

export default function LandingPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  async function createCanvas() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/canvases", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create canvas");
      saveFacilitatorToken(data.id, data.facilitator_token);
      if (data.facilitator_participant_id) {
        saveFacilitatorParticipantId(data.id, data.facilitator_participant_id);
      }
      router.push(`/canvas/${data.room_code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setCreating(false);
    }
  }

  function joinCanvas(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (/^\d{4}$/.test(code)) router.push(`/join/${code}`);
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6 bg-grey-100">
      <div className="w-full max-w-xl">
        <div className="mb-12 text-center">
          <p className="text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
            🛠️ Workshop tool
          </p>
          <h1 className="text-[48px] font-bold tracking-tight text-foreground leading-[1.2]">
            🧪 Experiment Lifecycle Canvas
          </h1>
          <p className="mt-4 text-base text-grey-800">
            🔬 Map how experiments move from idea to production — together.
          </p>
        </div>

        <button
          onClick={createCanvas}
          disabled={creating}
          className="w-full h-[44px] rounded-[4px] bg-deep-blue-800 text-white px-6 text-sm font-medium hover:bg-deep-blue-600 disabled:opacity-50 transition-colors"
        >
          {creating ? "⏳ Creating canvas…" : "🚀 Create canvas"}
        </button>

        {error ? (
          <p className="mt-3 text-xs text-[var(--error-fg)] text-center">{error}</p>
        ) : null}

        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-grey-300" />
          <span className="text-[12px] font-medium uppercase tracking-[2px] text-grey-600">🚪 or join</span>
          <div className="h-px flex-1 bg-grey-300" />
        </div>

        <form onSubmit={joinCanvas} className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            pattern="\d{4}"
            placeholder="4-digit code"
            className="flex-1 h-[42px] rounded-[4px] border border-border px-[14px] text-base bg-white focus:outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={joinCode.length !== 4}
            className="h-[44px] rounded-[4px] bg-white border border-foreground text-foreground px-6 text-sm font-medium hover:bg-grey-100 disabled:opacity-40"
          >
            Join →
          </button>
        </form>
      </div>
    </main>
  );
}
