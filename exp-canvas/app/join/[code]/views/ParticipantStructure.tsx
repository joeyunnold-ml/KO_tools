"use client";

import { Fragment } from "react";
import type { CanvasState } from "@/lib/useCanvas";
import { rowColor } from "@/lib/palette";

export default function ParticipantStructure({ state }: { state: CanvasState }) {
  const columns = [...state.columns].sort((a, b) => a.sort_order - b.sort_order);
  const rows = [...state.rows].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 bg-grey-100">
      <div className="max-w-5xl mx-auto w-full">
        <p className="text-[12px] md:text-[13px] font-medium uppercase tracking-[2px] text-grey-700 mb-1">
          🛠️ Setting up
        </p>
        <h1 className="text-[20px] md:text-[28px] font-medium leading-snug text-foreground mb-1">
          The facilitator is editing the canvas
        </h1>
        <p className="text-[13px] md:text-[14px] text-grey-700 mb-6">
          You&apos;ll be able to add your contributions shortly. Here&apos;s the current shape:
        </p>

        <section className="mb-8">
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
            📊 Stages
          </p>
          {columns.length === 0 ? (
            <span className="text-sm text-grey-600">No stages yet…</span>
          ) : (
            // flex-wrap so wide screens fit on one row; mobile wraps as needed.
            // Each [chip + arrow] sits inside an inline-flex unit so the arrow
            // always wraps with the chip it follows — never alone at the start
            // of a wrapped line.
            <div className="flex flex-wrap items-center gap-y-2">
              {columns.map((c, i) => (
                <Fragment key={c.id}>
                  <span className="inline-flex items-center mr-2">
                    <span className="rounded-[4px] bg-white border border-border px-3 py-1.5 text-sm font-medium text-foreground whitespace-nowrap">
                      {c.label}
                    </span>
                    {i < columns.length - 1 ? <StageArrow /> : null}
                  </span>
                </Fragment>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="text-[12px] font-medium uppercase tracking-[2px] text-grey-700 mb-3">
            📋 Dimensions
          </p>
          <div className="space-y-1.5">
            {rows.length === 0 ? (
              <span className="text-sm text-grey-600">No dimensions yet…</span>
            ) : (
              rows.map((r) => {
                const color = rowColor(r.color);
                return (
                  <div
                    key={r.id}
                    className="rounded-[4px] border-2 px-3 py-2 text-sm font-medium"
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

function StageArrow() {
  return (
    <span className="flex-shrink-0 inline-flex items-center ml-2" aria-hidden>
      <svg
        width="24"
        height="12"
        viewBox="0 0 24 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="0" y1="6" x2="18" y2="6" stroke="#939598" strokeWidth="2" strokeLinecap="round" />
        <polyline
          points="14,2 22,6 14,10"
          fill="none"
          stroke="#939598"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
