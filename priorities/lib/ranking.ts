// Shared ranking + tally helpers used by the assign + read-only views.

import type { VoteState } from "./useVotes";
import type { VotePriorityRow } from "./types";

export interface RankedPriority {
  priority: VotePriorityRow;
  total: number;
  ml: number;
  avis: number;
  rank: number; // 1-indexed display rank (ties share a rank)
}

export function buildRanking(state: VoteState): RankedPriority[] {
  const participants = state.participants;
  const participantsById = new Map(participants.map((p) => [p.id, p]));

  // Tally per priority
  const totals = new Map<string, { total: number; ml: number; avis: number }>();
  for (const p of state.priorities) {
    totals.set(p.id, { total: 0, ml: 0, avis: 0 });
  }
  for (const v of state.votes) {
    const t = totals.get(v.priority_id);
    if (!t) continue;
    t.total += 1;
    const part = participantsById.get(v.participant_id);
    if (part?.team === "monstarlab") t.ml += 1;
    if (part?.team === "avis") t.avis += 1;
  }

  // Sort: votes desc, then original sort_order asc (tie-break by setup order)
  const sorted = [...state.priorities].sort((a, b) => {
    const ta = totals.get(a.id)?.total ?? 0;
    const tb = totals.get(b.id)?.total ?? 0;
    if (ta !== tb) return tb - ta;
    return a.sort_order - b.sort_order;
  });

  // Assign ranks with tie handling (1, 1, 3, 4, ...)
  const result: RankedPriority[] = [];
  let lastTotal = -1;
  let lastRank = 0;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const t = totals.get(p.id) ?? { total: 0, ml: 0, avis: 0 };
    const rank = t.total === lastTotal ? lastRank : i + 1;
    lastTotal = t.total;
    lastRank = rank;
    result.push({ priority: p, ...t, rank });
  }
  return result;
}
