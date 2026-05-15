"use client";

import { getSupabase } from "./supabase";
import type { Phase, Team } from "./types";

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function joinVote(opts: { sessionId: string; name: string; team: Team }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("vote_participants")
    .insert({ session_id: opts.sessionId, name: opts.name, team: opts.team })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Phase + session config
// ---------------------------------------------------------------------------

export async function advancePhase(opts: { sessionId: string; facilitatorToken: string; to: Phase }) {
  const sb = getSupabase();
  const { error } = await sb
    .from("vote_sessions")
    .update({ phase: opts.to })
    .eq("id", opts.sessionId)
    .eq("facilitator_token", opts.facilitatorToken);
  if (error) throw error;
}

export async function setConfig(opts: {
  sessionId: string;
  facilitatorToken: string;
  captureEnabled?: boolean;
  votesPerPerson?: number;
}) {
  const sb = getSupabase();
  const patch: Record<string, boolean | number> = {};
  if (typeof opts.captureEnabled === "boolean") patch.capture_enabled = opts.captureEnabled;
  if (typeof opts.votesPerPerson === "number") patch.votes_per_person = opts.votesPerPerson;
  const { error } = await sb
    .from("vote_sessions")
    .update(patch)
    .eq("id", opts.sessionId)
    .eq("facilitator_token", opts.facilitatorToken);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Priorities
// ---------------------------------------------------------------------------

export async function createPriority(opts: {
  sessionId: string;
  title: string;
  description?: string | null;
  accessNeeded?: string | null;
  isPreloaded: boolean;
  submittedBy?: string | null;
  sortOrder: number;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("vote_priorities")
    .insert({
      session_id: opts.sessionId,
      title: opts.title.slice(0, 100),
      description: opts.description?.slice(0, 200) ?? null,
      access_needed: opts.accessNeeded ?? null,
      is_preloaded: opts.isPreloaded,
      submitted_by: opts.submittedBy ?? null,
      sort_order: opts.sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePriority(opts: {
  id: string;
  title?: string;
  description?: string | null;
  accessNeeded?: string | null;
  mlOwner?: string | null;
  avisCounterpart?: string | null;
  firstAction?: string | null;
  accepted?: boolean;
}) {
  const sb = getSupabase();
  const patch: Record<string, string | boolean | null> = {};
  if (opts.title !== undefined) patch.title = opts.title.slice(0, 100);
  if (opts.description !== undefined) patch.description = opts.description?.slice(0, 200) ?? null;
  if (opts.accessNeeded !== undefined) patch.access_needed = opts.accessNeeded ?? null;
  if (opts.mlOwner !== undefined) patch.ml_owner = opts.mlOwner ?? null;
  if (opts.avisCounterpart !== undefined) patch.avis_counterpart = opts.avisCounterpart ?? null;
  if (opts.firstAction !== undefined) patch.first_action = opts.firstAction ?? null;
  if (typeof opts.accepted === "boolean") patch.accepted = opts.accepted;
  const { error } = await sb.from("vote_priorities").update(patch).eq("id", opts.id);
  if (error) throw error;
}

export async function deletePriority(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("vote_priorities").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export async function castVote(opts: {
  sessionId: string;
  priorityId: string;
  participantId: string;
}) {
  const sb = getSupabase();
  const { error } = await sb.from("priority_votes").insert({
    session_id: opts.sessionId,
    priority_id: opts.priorityId,
    participant_id: opts.participantId,
  });
  if (error) throw error;
}

export async function removeOneVote(opts: { participantId: string; priorityId: string }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("priority_votes")
    .select("id")
    .eq("participant_id", opts.participantId)
    .eq("priority_id", opts.priorityId)
    .limit(1);
  if (error) throw error;
  if (!data?.length) return;
  const { error: delErr } = await sb.from("priority_votes").delete().eq("id", data[0].id);
  if (delErr) throw delErr;
}
