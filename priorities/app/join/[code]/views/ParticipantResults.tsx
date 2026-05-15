"use client";

import ReadOnlyView from "@/app/votes/[code]/phases/ReadOnlyView";
import type { VoteState } from "@/lib/useVotes";

// Participants see the same commitment table as the post-complete shareable
// URL — read-only, with vote counts + assigned owners/actions updating live
// during the assign phase via Realtime.
export default function ParticipantResults({ state }: { state: VoteState }) {
  return <ReadOnlyView state={state} />;
}
