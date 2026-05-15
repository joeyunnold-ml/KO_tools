"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import type {
  VoteSessionRow,
  VoteParticipantRow,
  VotePriorityRow,
  PriorityVoteRow,
} from "./types";

export interface VoteState {
  session: VoteSessionRow | null;
  participants: VoteParticipantRow[];
  priorities: VotePriorityRow[];
  votes: PriorityVoteRow[];
  loading: boolean;
  error: string | null;
}

const EMPTY: VoteState = {
  session: null,
  participants: [],
  priorities: [],
  votes: [],
  loading: true,
  error: null,
};

export function useVotes(roomCode: string): VoteState {
  const [state, setState] = useState<VoteState>(EMPTY);

  useEffect(() => {
    const sb = getSupabase();
    let cancelled = false;
    let channel: ReturnType<typeof sb.channel> | null = null;

    async function load() {
      const { data: sessionData, error: sessionErr } = await sb
        .from("vote_sessions")
        .select("*")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (sessionErr || !sessionData) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: sessionErr?.message ?? "Session not found",
          }));
        }
        return;
      }
      const sessionId = sessionData.id;

      const [pRes, prRes, vRes] = await Promise.all([
        sb.from("vote_participants").select("*").eq("session_id", sessionId).order("joined_at"),
        sb.from("vote_priorities").select("*").eq("session_id", sessionId).order("sort_order"),
        sb.from("priority_votes").select("*").eq("session_id", sessionId),
      ]);

      if (cancelled) return;

      setState({
        session: sessionData as VoteSessionRow,
        participants: (pRes.data ?? []) as VoteParticipantRow[],
        priorities: (prRes.data ?? []) as VotePriorityRow[],
        votes: (vRes.data ?? []) as PriorityVoteRow[],
        loading: false,
        error: null,
      });

      channel = sb
        .channel(`votes-${sessionId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "vote_sessions", filter: `id=eq.${sessionId}` },
          (p) =>
            setState((s) =>
              p.eventType === "DELETE"
                ? { ...s, session: null }
                : { ...s, session: p.new as VoteSessionRow },
            ),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "vote_participants", filter: `session_id=eq.${sessionId}` },
          (p) => setState((s) => applyChange(s, "participants", p)),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "vote_priorities", filter: `session_id=eq.${sessionId}` },
          (p) => setState((s) => applyChange(s, "priorities", p)),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "priority_votes", filter: `session_id=eq.${sessionId}` },
          (p) => setState((s) => applyChange(s, "votes", p)),
        )
        .subscribe();
    }

    load();
    return () => {
      cancelled = true;
      if (channel) getSupabase().removeChannel(channel);
    };
  }, [roomCode]);

  return state;
}

type ChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

function applyChange<K extends "participants" | "priorities" | "votes">(
  state: VoteState,
  key: K,
  payload: ChangePayload,
): VoteState {
  const list = state[key] as Array<{ id: string }>;
  if (payload.eventType === "INSERT") {
    const row = payload.new as { id: string };
    if (list.some((r) => r.id === row.id)) return state;
    return { ...state, [key]: [...list, row] } as VoteState;
  }
  if (payload.eventType === "UPDATE") {
    const row = payload.new as { id: string };
    return { ...state, [key]: list.map((r) => (r.id === row.id ? row : r)) } as VoteState;
  }
  if (payload.eventType === "DELETE") {
    const row = payload.old as { id: string };
    return { ...state, [key]: list.filter((r) => r.id !== row.id) } as VoteState;
  }
  return state;
}
