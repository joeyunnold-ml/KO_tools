"use client";

import type { CanvasState } from "@/lib/useCanvas";
import { rowColor } from "@/lib/palette";

export default function ParticipantStructure({ state }: { state: CanvasState }) {
  const columns = [...state.columns].sort((a, b) => a.sort_order - b.sort_order);
  const rows = [...state.rows].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="flex-1 flex flex-col p-4 bg-grey-100">
      <div className="max-w-md mx-auto w-full">
        <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">🛠️ Setting up</p>
        <h1 className="text-[20px] font-medium leading-snug text-foreground mb-1">
          The facilitator is editing the canvas
        </h1>
        <p className="text-[13px] text-grey-700 mb-5">
          You&apos;ll be able to add your contributions shortly. Here&apos;s the current shape:
        </p>

        <section className="mb-5">
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">📊 Stages</p>
          <div className="flex flex-wrap gap-1.5">
            {columns.length === 0 ? (
              <span className="text-sm text-grey-600">No stages yet…</span>
            ) : (
              columns.map((c) => (
                <span
                  key={c.id}
                  className="rounded-[4px] bg-white border border-border px-2 py-1 text-sm"
                >
                  {c.label}
                </span>
              ))
            )}
          </div>
        </section>

        <section>
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-2">📋 Dimensions</p>
          <div className="space-y-1.5">
            {rows.length === 0 ? (
              <span className="text-sm text-grey-600">No dimensions yet…</span>
            ) : (
              rows.map((r) => {
                const color = rowColor(r.color);
                return (
                  <div
                    key={r.id}
                    className="rounded-[4px] border-2 px-3 py-1.5 text-sm font-medium"
                    style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
                  >
                    {r.label}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
