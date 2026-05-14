"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import type {
  CanvasRow,
  CanvasParticipantRow,
  CanvasColumnRow,
  CanvasRowRow,
  LifecycleSubmissionRow,
  StickyRow,
} from "./types";

export interface CanvasState {
  canvas: CanvasRow | null;
  participants: CanvasParticipantRow[];
  submissions: LifecycleSubmissionRow[];
  columns: CanvasColumnRow[];
  rows: CanvasRowRow[];
  stickies: StickyRow[];
  loading: boolean;
  error: string | null;
}

const EMPTY: CanvasState = {
  canvas: null,
  participants: [],
  submissions: [],
  columns: [],
  rows: [],
  stickies: [],
  loading: true,
  error: null,
};

export function useCanvas(roomCode: string): CanvasState {
  const [state, setState] = useState<CanvasState>(EMPTY);

  useEffect(() => {
    const sb = getSupabase();
    let cancelled = false;
    let channel: ReturnType<typeof sb.channel> | null = null;

    async function load() {
      const { data: canvasData, error: canvasErr } = await sb
        .from("canvases")
        .select("*")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (canvasErr || !canvasData) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: canvasErr?.message ?? "Canvas not found",
          }));
        }
        return;
      }

      const canvasId = canvasData.id;
      const [pRes, sRes, cRes, rRes, stRes] = await Promise.all([
        sb.from("canvas_participants").select("*").eq("canvas_id", canvasId).order("joined_at"),
        sb.from("lifecycle_submissions").select("*").eq("canvas_id", canvasId).order("submitted_at"),
        sb.from("canvas_columns").select("*").eq("canvas_id", canvasId).order("sort_order"),
        sb.from("canvas_rows").select("*").eq("canvas_id", canvasId).order("sort_order"),
        sb.from("stickies").select("*").eq("canvas_id", canvasId).order("created_at"),
      ]);

      if (cancelled) return;

      setState({
        canvas: canvasData as CanvasRow,
        participants: (pRes.data ?? []) as CanvasParticipantRow[],
        submissions: (sRes.data ?? []) as LifecycleSubmissionRow[],
        columns: (cRes.data ?? []) as CanvasColumnRow[],
        rows: (rRes.data ?? []) as CanvasRowRow[],
        stickies: (stRes.data ?? []) as StickyRow[],
        loading: false,
        error: null,
      });

      channel = sb
        .channel(`canvas-${canvasId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "canvases", filter: `id=eq.${canvasId}` },
          (p) => setState((s) => (p.eventType === "DELETE" ? { ...s, canvas: null } : { ...s, canvas: p.new as CanvasRow })),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "canvas_participants", filter: `canvas_id=eq.${canvasId}` },
          (p) => setState((s) => applyChange(s, "participants", p)),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lifecycle_submissions", filter: `canvas_id=eq.${canvasId}` },
          (p) => setState((s) => applyChange(s, "submissions", p)),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "canvas_columns", filter: `canvas_id=eq.${canvasId}` },
          (p) => setState((s) => applyChange(s, "columns", p)),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "canvas_rows", filter: `canvas_id=eq.${canvasId}` },
          (p) => setState((s) => applyChange(s, "rows", p)),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "stickies", filter: `canvas_id=eq.${canvasId}` },
          (p) => setState((s) => applyChange(s, "stickies", p)),
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

function applyChange<K extends "participants" | "submissions" | "columns" | "rows" | "stickies">(
  state: CanvasState,
  key: K,
  payload: ChangePayload,
): CanvasState {
  const list = state[key] as Array<{ id: string }>;
  if (payload.eventType === "INSERT") {
    const row = payload.new as { id: string };
    if (list.some((r) => r.id === row.id)) return state;
    return { ...state, [key]: [...list, row] } as CanvasState;
  }
  if (payload.eventType === "UPDATE") {
    const row = payload.new as { id: string };
    return { ...state, [key]: list.map((r) => (r.id === row.id ? row : r)) } as CanvasState;
  }
  if (payload.eventType === "DELETE") {
    const row = payload.old as { id: string };
    return { ...state, [key]: list.filter((r) => r.id !== row.id) } as CanvasState;
  }
  return state;
}
