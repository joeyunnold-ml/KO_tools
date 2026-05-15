"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import type {
  GroupRow,
  ParticipantRow,
  QuestionRow,
  ResponseRow,
  SessionRow,
  VoteRow,
} from "./types";

export interface SessionState {
  session: SessionRow | null;
  participants: ParticipantRow[];
  questions: QuestionRow[];
  responses: ResponseRow[];
  groups: GroupRow[];
  votes: VoteRow[];
  loading: boolean;
  error: string | null;
}

export function useSession(roomCode: string): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    participants: [],
    questions: [],
    responses: [],
    groups: [],
    votes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const sb = getSupabase();
    let cancelled = false;
    let channel: ReturnType<typeof sb.channel> | null = null;

    async function load() {
      const { data: sessionData, error: sessionErr } = await sb
        .from("sessions")
        .select("*")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (sessionErr || !sessionData) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: sessionErr?.message ?? "Session not found" }));
        }
        return;
      }
      const sessionId = sessionData.id;

      const [pRes, qRes, gRes, rRes, vRes] = await Promise.all([
        sb.from("participants").select("*").eq("session_id", sessionId).order("joined_at"),
        sb.from("questions").select("*").eq("session_id", sessionId).order("sort_order"),
        sb.from("groups").select("*").eq("session_id", sessionId).order("sort_order"),
        sb.from("responses").select("*").eq("session_id", sessionId).order("created_at"),
        sb.from("votes").select("*").eq("session_id", sessionId),
      ]);

      if (cancelled) return;

      setState({
        session: sessionData,
        participants: pRes.data ?? [],
        questions: qRes.data ?? [],
        groups: gRes.data ?? [],
        responses: rRes.data ?? [],
        votes: vRes.data ?? [],
        loading: false,
        error: null,
      });

      channel = sb
        .channel(`session-${sessionId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
          (payload) => {
            setState((s) => {
              if (payload.eventType === "DELETE") return { ...s, session: null };
              return { ...s, session: payload.new as SessionRow };
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
          (payload) => {
            setState((s) => applyChange(s, "participants", payload));
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` },
          (payload) => {
            setState((s) => applyChange(s, "questions", payload));
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "responses", filter: `session_id=eq.${sessionId}` },
          (payload) => {
            setState((s) => applyChange(s, "responses", payload));
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "groups", filter: `session_id=eq.${sessionId}` },
          (payload) => {
            setState((s) => applyChange(s, "groups", payload));
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `session_id=eq.${sessionId}` },
          (payload) => {
            setState((s) => applyChange(s, "votes", payload));
          },
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

function applyChange<K extends "participants" | "questions" | "responses" | "groups" | "votes">(
  state: SessionState,
  key: K,
  payload: ChangePayload,
): SessionState {
  const list = state[key] as Array<{ id: string }>;
  if (payload.eventType === "INSERT") {
    const row = payload.new as { id: string };
    if (list.some((r) => r.id === row.id)) return state;
    return { ...state, [key]: [...list, row] } as SessionState;
  }
  if (payload.eventType === "UPDATE") {
    const row = payload.new as { id: string };
    return { ...state, [key]: list.map((r) => (r.id === row.id ? row : r)) } as SessionState;
  }
  if (payload.eventType === "DELETE") {
    const row = payload.old as { id: string };
    return { ...state, [key]: list.filter((r) => r.id !== row.id) } as SessionState;
  }
  return state;
}
