"use client";

import { getSupabase } from "./supabase";
import type { Framing, Lane, Phase, Team } from "./types";

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function joinLanes(opts: { sessionId: string; name: string; team: Team }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("lane_participants")
    .insert({ session_id: opts.sessionId, name: opts.name, team: opts.team })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

export async function advancePhase(opts: { sessionId: string; facilitatorToken: string; to: Phase }) {
  const sb = getSupabase();
  const { error } = await sb
    .from("lane_sessions")
    .update({ phase: opts.to })
    .eq("id", opts.sessionId)
    .eq("facilitator_token", opts.facilitatorToken);
  if (error) throw error;
}

export async function setConfig(opts: {
  sessionId: string;
  facilitatorToken: string;
  captureEnabled?: boolean;
  blindSortEnabled?: boolean;
}) {
  const sb = getSupabase();
  const patch: Record<string, boolean> = {};
  if (typeof opts.captureEnabled === "boolean") patch.capture_enabled = opts.captureEnabled;
  if (typeof opts.blindSortEnabled === "boolean") patch.blind_sort_enabled = opts.blindSortEnabled;
  const { error } = await sb
    .from("lane_sessions")
    .update(patch)
    .eq("id", opts.sessionId)
    .eq("facilitator_token", opts.facilitatorToken);
  if (error) throw error;
}

export async function setFraming(opts: {
  sessionId: string;
  facilitatorToken: string;
  framing: Framing;
  laneALabel: string;
  laneADescription: string;
  laneBLabel: string;
  laneBDescription: string;
  laneCLabel: string;
  laneCDescription: string;
}) {
  const sb = getSupabase();
  const { error } = await sb
    .from("lane_sessions")
    .update({
      framing: opts.framing,
      lane_a_label: opts.laneALabel.slice(0, 30),
      lane_a_description: opts.laneADescription.slice(0, 150),
      lane_b_label: opts.laneBLabel.slice(0, 30),
      lane_b_description: opts.laneBDescription.slice(0, 150),
      lane_c_label: opts.laneCLabel.slice(0, 30),
      lane_c_description: opts.laneCDescription.slice(0, 150),
    })
    .eq("id", opts.sessionId)
    .eq("facilitator_token", opts.facilitatorToken);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function createItem(opts: {
  sessionId: string;
  title: string;
  description?: string | null;
  source?: string | null;
  isPreloaded: boolean;
  submittedBy?: string | null;
  sortOrder: number;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("lane_items")
    .insert({
      session_id: opts.sessionId,
      title: opts.title.slice(0, 100),
      description: opts.description?.slice(0, 200) ?? null,
      source: opts.source ?? null,
      is_preloaded: opts.isPreloaded,
      submitted_by: opts.submittedBy ?? null,
      sort_order: opts.sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(opts: {
  id: string;
  title?: string;
  description?: string | null;
  source?: string | null;
}) {
  const sb = getSupabase();
  const patch: Record<string, string | null> = {};
  if (typeof opts.title === "string") patch.title = opts.title.slice(0, 100);
  if (opts.description !== undefined) patch.description = opts.description?.slice(0, 200) ?? null;
  if (opts.source !== undefined) patch.source = opts.source ?? null;
  const { error } = await sb.from("lane_items").update(patch).eq("id", opts.id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("lane_items").delete().eq("id", id);
  if (error) throw error;
}

export async function setFinalLane(opts: { id: string; lane: Lane | null }) {
  const sb = getSupabase();
  const { error } = await sb.from("lane_items").update({ final_lane: opts.lane }).eq("id", opts.id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Classifications
// ---------------------------------------------------------------------------

export async function classify(opts: {
  sessionId: string;
  itemId: string;
  participantId: string;
  lane: Lane;
}) {
  const sb = getSupabase();
  const { error } = await sb
    .from("lane_classifications")
    .upsert(
      {
        session_id: opts.sessionId,
        item_id: opts.itemId,
        participant_id: opts.participantId,
        lane: opts.lane,
      },
      { onConflict: "item_id,participant_id" },
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// AI analysis
// ---------------------------------------------------------------------------

export async function runAnalysis(opts: {
  sessionId: string;
  facilitatorToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/lanes/${opts.sessionId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ facilitatorToken: opts.facilitatorToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
  return { ok: true };
}
