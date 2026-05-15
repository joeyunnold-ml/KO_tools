"use client";

import { getSupabase } from "./supabase";
import type { Phase } from "./types";

export async function joinSession(opts: { sessionId: string; name: string }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("participants")
    .insert({ session_id: opts.sessionId, name: opts.name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function advancePhase(opts: { sessionId: string; facilitatorToken: string; to: Phase }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sessions")
    .update({ phase: opts.to })
    .eq("id", opts.sessionId)
    .eq("facilitator_token", opts.facilitatorToken)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function createQuestion(opts: {
  sessionId: string;
  text: string;
  sortOrder: number;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("questions")
    .insert({ session_id: opts.sessionId, text: opts.text, sort_order: opts.sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuestion(opts: { id: string; text: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("questions").update({ text: opts.text }).eq("id", opts.id);
  if (error) throw error;
}

export async function reorderQuestion(opts: { id: string; sortOrder: number }) {
  const sb = getSupabase();
  const { error } = await sb.from("questions").update({ sort_order: opts.sortOrder }).eq("id", opts.id);
  if (error) throw error;
}

export async function deleteQuestion(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("questions").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Responses (now question-scoped)
// ---------------------------------------------------------------------------

export async function submitResponse(opts: {
  sessionId: string;
  questionId: string;
  participantId: string;
  text: string;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("responses")
    .insert({
      session_id: opts.sessionId,
      question_id: opts.questionId,
      participant_id: opts.participantId,
      text: opts.text.slice(0, 280),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateResponse(opts: { id: string; text: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("responses").update({ text: opts.text.slice(0, 280) }).eq("id", opts.id);
  if (error) throw error;
}

export async function deleteResponse(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("responses").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Groups (now question-scoped)
// ---------------------------------------------------------------------------

export async function createGroup(opts: {
  sessionId: string;
  questionId: string;
  label: string;
  sortOrder: number;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("groups")
    .insert({
      session_id: opts.sessionId,
      question_id: opts.questionId,
      label: opts.label,
      sort_order: opts.sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameGroup(opts: { id: string; label: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("groups").update({ label: opts.label }).eq("id", opts.id);
  if (error) throw error;
}

export async function deleteGroup(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("groups").delete().eq("id", id);
  if (error) throw error;
}

export async function moveResponseToGroup(opts: { responseId: string; groupId: string | null }) {
  const sb = getSupabase();
  const { error } = await sb
    .from("responses")
    .update({ group_id: opts.groupId })
    .eq("id", opts.responseId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Votes (per-question limit enforced by DB trigger)
// ---------------------------------------------------------------------------

export async function castVote(opts: { sessionId: string; participantId: string; groupId: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("votes").insert({
    session_id: opts.sessionId,
    participant_id: opts.participantId,
    group_id: opts.groupId,
  });
  if (error) throw error;
}

export async function removeOneVote(opts: { participantId: string; groupId: string }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("votes")
    .select("id")
    .eq("participant_id", opts.participantId)
    .eq("group_id", opts.groupId)
    .limit(1);
  if (error) throw error;
  if (!data?.length) return;
  const { error: delErr } = await sb.from("votes").delete().eq("id", data[0].id);
  if (delErr) throw delErr;
}

// ---------------------------------------------------------------------------
// Auto-cluster (scoped to a single question)
// ---------------------------------------------------------------------------

export async function autoCluster(opts: {
  sessionId: string;
  questionId: string;
  facilitatorToken: string;
  force?: boolean;
}): Promise<{ ok: boolean; group_count?: number; error?: string }> {
  const res = await fetch("/api/cluster", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
  return { ok: true, group_count: data?.group_count };
}
