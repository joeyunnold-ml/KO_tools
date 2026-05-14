"use client";

import { getSupabase } from "./supabase";
import type { Phase, RowColorKey } from "./types";

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function joinCanvas(opts: { canvasId: string; name: string }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("canvas_participants")
    .insert({ canvas_id: opts.canvasId, name: opts.name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Phase transitions (facilitator-only)
// ---------------------------------------------------------------------------

export async function advancePhase(opts: { canvasId: string; facilitatorToken: string; to: Phase }) {
  const sb = getSupabase();
  const { error } = await sb
    .from("canvases")
    .update({ phase: opts.to })
    .eq("id", opts.canvasId)
    .eq("facilitator_token", opts.facilitatorToken);
  if (error) throw error;
}

export async function setFocusedColumn(opts: {
  canvasId: string;
  facilitatorToken: string;
  columnId: string | null;
}) {
  const sb = getSupabase();
  const { error } = await sb
    .from("canvases")
    .update({ focused_column_id: opts.columnId })
    .eq("id", opts.canvasId)
    .eq("facilitator_token", opts.facilitatorToken);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Beat 1 — Elicitation
// ---------------------------------------------------------------------------

export async function submitLifecycle(opts: {
  canvasId: string;
  participantId: string;
  stages: string[];
}) {
  const sb = getSupabase();
  // Upsert by (canvas_id, participant_id) so participants can edit before close
  const { error } = await sb
    .from("lifecycle_submissions")
    .upsert(
      {
        canvas_id: opts.canvasId,
        participant_id: opts.participantId,
        stages: opts.stages,
      },
      { onConflict: "canvas_id,participant_id" },
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Beat 3 — Structure
// ---------------------------------------------------------------------------

export async function createColumn(opts: { canvasId: string; label: string; sortOrder: number }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("canvas_columns")
    .insert({ canvas_id: opts.canvasId, label: opts.label, sort_order: opts.sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameColumn(opts: { id: string; label: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("canvas_columns").update({ label: opts.label }).eq("id", opts.id);
  if (error) throw error;
}

export async function reorderColumn(opts: { id: string; sortOrder: number }) {
  const sb = getSupabase();
  const { error } = await sb
    .from("canvas_columns")
    .update({ sort_order: opts.sortOrder })
    .eq("id", opts.id);
  if (error) throw error;
}

export async function deleteColumn(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("canvas_columns").delete().eq("id", id);
  if (error) throw error;
}

export async function createRow(opts: {
  canvasId: string;
  label: string;
  color: RowColorKey;
  sortOrder: number;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("canvas_rows")
    .insert({
      canvas_id: opts.canvasId,
      label: opts.label,
      color: opts.color,
      sort_order: opts.sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameRow(opts: { id: string; label: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("canvas_rows").update({ label: opts.label }).eq("id", opts.id);
  if (error) throw error;
}

export async function setRowColor(opts: { id: string; color: RowColorKey }) {
  const sb = getSupabase();
  const { error } = await sb.from("canvas_rows").update({ color: opts.color }).eq("id", opts.id);
  if (error) throw error;
}

export async function reorderRow(opts: { id: string; sortOrder: number }) {
  const sb = getSupabase();
  const { error } = await sb.from("canvas_rows").update({ sort_order: opts.sortOrder }).eq("id", opts.id);
  if (error) throw error;
}

export async function deleteRow(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("canvas_rows").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Stickies
// ---------------------------------------------------------------------------

export async function createSticky(opts: {
  canvasId: string;
  columnId: string;
  rowId: string;
  participantId: string;
  text: string;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("stickies")
    .insert({
      canvas_id: opts.canvasId,
      column_id: opts.columnId,
      row_id: opts.rowId,
      participant_id: opts.participantId,
      text: opts.text.slice(0, 200),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStickyText(opts: { id: string; text: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("stickies").update({ text: opts.text.slice(0, 200) }).eq("id", opts.id);
  if (error) throw error;
}

export async function moveSticky(opts: { id: string; columnId: string; rowId: string }) {
  const sb = getSupabase();
  const { error } = await sb
    .from("stickies")
    .update({ column_id: opts.columnId, row_id: opts.rowId })
    .eq("id", opts.id);
  if (error) throw error;
}

export async function toggleHighlight(opts: { id: string; highlighted: boolean }) {
  const sb = getSupabase();
  const { error } = await sb.from("stickies").update({ highlighted: opts.highlighted }).eq("id", opts.id);
  if (error) throw error;
}

export async function deleteSticky(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("stickies").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Beat 2 → 3 transition (accept synthesis / start from scratch)
// ---------------------------------------------------------------------------

import { DEFAULT_ROWS, DEFAULT_COLUMNS } from "./palette";

export async function seedStructure(opts: {
  canvasId: string;
  facilitatorToken: string;
  columnLabels: string[];
}) {
  const sb = getSupabase();

  // Insert columns
  const { error: cErr } = await sb.from("canvas_columns").insert(
    opts.columnLabels.map((label, i) => ({
      canvas_id: opts.canvasId,
      label,
      sort_order: i,
    })),
  );
  if (cErr) throw cErr;

  // Insert default rows
  const { error: rErr } = await sb.from("canvas_rows").insert(
    DEFAULT_ROWS.map((r) => ({
      canvas_id: opts.canvasId,
      label: r.label,
      color: r.color,
      sort_order: r.sort_order,
    })),
  );
  if (rErr) throw rErr;

  // Advance phase
  await advancePhase({
    canvasId: opts.canvasId,
    facilitatorToken: opts.facilitatorToken,
    to: "structure",
  });
}

export async function seedDefaultStructure(opts: {
  canvasId: string;
  facilitatorToken: string;
}) {
  await seedStructure({
    canvasId: opts.canvasId,
    facilitatorToken: opts.facilitatorToken,
    columnLabels: DEFAULT_COLUMNS.map((c) => c.label),
  });
}

// ---------------------------------------------------------------------------
// Synthesis API (server route call)
// ---------------------------------------------------------------------------

export async function runSynthesis(opts: {
  canvasId: string;
  facilitatorToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/canvas/${opts.canvasId}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ facilitatorToken: opts.facilitatorToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
  return { ok: true };
}
