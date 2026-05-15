"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import type {
  LaneSessionRow,
  LaneParticipantRow,
  LaneItemRow,
  LaneClassificationRow,
} from "./types";

export interface LaneState {
  session: LaneSessionRow | null;
  participants: LaneParticipantRow[];
  items: LaneItemRow[];
  classifications: LaneClassificationRow[];
  loading: boolean;
  error: string | null;
}

const EMPTY: LaneState = {
  session: null,
  participants: [],
  items: [],
  classifications: [],
  loading: true,
  error: null,
};

export function useLanes(roomCode: string): LaneState {
  const [state, setState] = useState<LaneState>(EMPTY);

  useEffect(() => {
    const sb = getSupabase();
    let cancelled = false;
    let channel: ReturnType<typeof sb.channel> | null = null;

    async function load() {
      const { data: sessionData, error: sessionErr } = await sb
        .from("lane_sessions")
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
      const [pRes, iRes, cRes] = await Promise.all([
        sb.from("lane_participants").select("*").eq("session_id", sessionId).order("joined_at"),
        sb.from("lane_items").select("*").eq("session_id", sessionId).order("sort_order"),
        sb.from("lane_classifications").select("*").eq("session_id", sessionId),
      ]);

      if (cancelled) return;

      setState({
        session: sessionData as LaneSessionRow,
        participants: (pRes.data ?? []) as LaneParticipantRow[],
        items: (iRes.data ?? []) as LaneItemRow[],
        classifications: (cRes.data ?? []) as LaneClassificationRow[],
        loading: false,
        error: null,
      });

      channel = sb
        .channel(`lanes-${sessionId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lane_sessions", filter: `id=eq.${sessionId}` },
          (p) =>
            setState((s) =>
              p.eventType === "DELETE"
                ? { ...s, session: null }
                : { ...s, session: p.new as LaneSessionRow },
            ),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lane_participants", filter: `session_id=eq.${sessionId}` },
          (p) => setState((s) => applyChange(s, "participants", p)),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lane_items", filter: `session_id=eq.${sessionId}` },
          (p) => setState((s) => applyChange(s, "items", p)),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lane_classifications", filter: `session_id=eq.${sessionId}` },
          (p) => setState((s) => applyChange(s, "classifications", p)),
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

function applyChange<K extends "participants" | "items" | "classifications">(
  state: LaneState,
  key: K,
  payload: ChangePayload,
): LaneState {
  const list = state[key] as Array<{ id: string }>;
  if (payload.eventType === "INSERT") {
    const row = payload.new as { id: string };
    if (list.some((r) => r.id === row.id)) return state;
    return { ...state, [key]: [...list, row] } as LaneState;
  }
  if (payload.eventType === "UPDATE") {
    const row = payload.new as { id: string };
    return { ...state, [key]: list.map((r) => (r.id === row.id ? row : r)) } as LaneState;
  }
  if (payload.eventType === "DELETE") {
    const row = payload.old as { id: string };
    return { ...state, [key]: list.filter((r) => r.id !== row.id) } as LaneState;
  }
  return state;
}
