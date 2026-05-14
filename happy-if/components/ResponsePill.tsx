"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ResponseRow } from "@/lib/types";
import { pillColorForParticipant, type GroupPalette } from "@/lib/palette";

interface Props {
  response: ResponseRow;
  participantName: string;
  participantId: string;
  palette?: GroupPalette;
  /** When true, render compact (smaller padding + text) — for dense lists. */
  compact?: boolean;
}

/**
 * Collapsed pill view of a response — name pill + abbreviated summary.
 * Click to expand the full text. Used in Cluster, Vote, and Results phases
 * so a response card looks the same wherever it appears.
 *
 * The name pill's color is derived deterministically from the participant ID,
 * so a given person shows the same color on every screen.
 */
export default function ResponsePill({
  response,
  participantName,
  participantId,
  palette,
  compact,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const pill = pillColorForParticipant(participantId);
  const borderColor = palette ? palette.pill : "var(--border)";

  const shortLabel =
    response.summary?.trim() ||
    (response.text.length > 60 ? response.text.slice(0, 60) + "…" : response.text);

  return (
    <div
      className="rounded-[6px] border bg-white"
      style={{ borderColor }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full text-left flex items-center gap-2 min-w-0 ${
          compact ? "p-2" : "p-2.5"
        }`}
      >
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: pill.bg, color: pill.fg }}
        >
          {participantName}
        </span>
        <span className="text-[13px] text-foreground truncate flex-1 leading-tight">
          {shortLabel}
        </span>
        <span className="text-grey-500 text-xs flex-shrink-0">
          {expanded ? "▾" : "▸"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-grey-200">
              <p className="text-sm leading-snug text-foreground italic">
                &ldquo;{response.text}&rdquo;
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
