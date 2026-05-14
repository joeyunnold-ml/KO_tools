"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { pillColorForParticipant, type RowColor } from "@/lib/palette";

interface MinimalResponse {
  id: string;
  text: string;
  summary?: string | null;
  participant_id: string;
}

interface Props {
  response: MinimalResponse;
  participantName: string;
  participantId: string;
  color?: RowColor;
  compact?: boolean;
}

/**
 * Collapsed pill view of a contribution. Lifted from happy-if's ResponsePill
 * and adapted to the exp-canvas type system. Available for any surface
 * that wants the same compact name-pill-plus-summary look.
 */
export default function ResponsePill({
  response,
  participantName,
  participantId,
  color,
  compact,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const pill = pillColorForParticipant(participantId);
  const borderColor = color ? color.border : "var(--border)";

  const shortLabel =
    response.summary?.trim() ||
    (response.text.length > 60 ? response.text.slice(0, 60) + "…" : response.text);

  return (
    <div className="rounded-[6px] border bg-white" style={{ borderColor }}>
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
        <span className="text-grey-500 text-xs flex-shrink-0">{expanded ? "▾" : "▸"}</span>
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
