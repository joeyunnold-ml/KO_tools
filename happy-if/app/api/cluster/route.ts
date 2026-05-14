import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ParticipantRow, ResponseRow, SessionRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // give the LLM call up to 60s

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars on server");
  return createClient(url, key, { auth: { persistSession: false } });
}

interface ClusterRequest {
  sessionId: string;
  facilitatorToken: string;
  force?: boolean;
}

interface LLMCluster {
  label: string;
  indices: number[];
}

interface LLMResponse {
  groups: LLMCluster[];
  unclustered?: number[];
}

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured — auto-clustering disabled" },
      { status: 503 },
    );
  }

  let body: ClusterRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { sessionId, facilitatorToken, force } = body;
  if (!sessionId || !facilitatorToken) {
    return NextResponse.json({ error: "Missing sessionId or facilitatorToken" }, { status: 400 });
  }

  const sb = admin();

  // 1. Validate facilitator token
  const { data: sessionData } = await sb
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  const session = sessionData as SessionRow | null;
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.facilitator_token !== facilitatorToken) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // 2. Skip if already clustered (unless force=true)
  const { data: existingGroups } = await sb
    .from("groups")
    .select("id")
    .eq("session_id", sessionId);
  if (existingGroups && existingGroups.length > 0 && !force) {
    return NextResponse.json({ ok: true, skipped: "groups_exist", group_count: existingGroups.length });
  }

  // 3. Fetch responses + participants
  const [responsesRes, participantsRes] = await Promise.all([
    sb.from("responses").select("*").eq("session_id", sessionId).order("created_at"),
    sb.from("participants").select("*").eq("session_id", sessionId),
  ]);
  const responses = (responsesRes.data ?? []) as ResponseRow[];
  const participants = (participantsRes.data ?? []) as ParticipantRow[];

  if (responses.length === 0) {
    return NextResponse.json({ ok: true, group_count: 0, message: "No responses to cluster" });
  }

  const participantsById = new Map(participants.map((p) => [p.id, p]));

  // 4. Build the prompt
  const lines = responses.map((r, i) => {
    const p = participantsById.get(r.participant_id);
    const name = p?.name ?? "anon";
    return `[${i + 1}] ${name}: "${r.text}"`;
  });

  const prompt = `You are clustering responses from a workshop kickoff. The prompt was:

"I'll consider this engagement a success if ___"

Participant responses (the bracketed numbers are stable IDs you must reference):

${lines.join("\n")}

Your task: group these responses into 3-6 themed clusters.

Rules:
- Each cluster gets a short, descriptive label (2-5 words, Title Case)
- Use neutral, professional language (e.g., "Conversion Recovery", "Team Velocity", "Process Clarity")
- Group thematically similar responses together
- Use "unclustered" sparingly — only for responses that genuinely don't fit anywhere
- Every response index must appear exactly once across "groups" and "unclustered"
- Aim for clusters of roughly similar size (3-6 ideal); avoid singleton clusters unless the response is a true outlier

Respond with ONLY valid JSON, no markdown fences, no preamble:

{
  "groups": [
    {"label": "Conversion Recovery", "indices": [1, 4, 7]},
    {"label": "Process Clarity", "indices": [2, 5]}
  ],
  "unclustered": [3]
}`;

  // 5. Call OpenRouter
  const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-4.6";
  let llmResponseText: string;
  try {
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/joeyunnold-ml/KO_tools",
        "X-Title": "Happy If Workshop Tool",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenRouter error", aiRes.status, errText);
      return NextResponse.json(
        { error: `OpenRouter ${aiRes.status}: ${errText.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const aiData = await aiRes.json();
    llmResponseText = aiData?.choices?.[0]?.message?.content ?? "";
    if (!llmResponseText) {
      return NextResponse.json({ error: "Empty LLM response" }, { status: 502 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: `OpenRouter request failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 502 },
    );
  }

  // 6. Parse JSON (strip code fences if present)
  let parsed: LLMResponse;
  try {
    const cleaned = llmResponseText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse LLM JSON", llmResponseText);
    return NextResponse.json(
      { error: `LLM returned invalid JSON: ${e instanceof Error ? e.message : "parse error"}` },
      { status: 502 },
    );
  }

  if (!Array.isArray(parsed?.groups)) {
    return NextResponse.json({ error: "LLM response missing 'groups' array" }, { status: 502 });
  }

  // 7. Write to database
  // If force=true, clear existing groups first
  if (force && existingGroups && existingGroups.length > 0) {
    await sb.from("groups").delete().eq("session_id", sessionId);
    await sb.from("responses").update({ group_id: null }).eq("session_id", sessionId);
  }

  for (let i = 0; i < parsed.groups.length; i++) {
    const g = parsed.groups[i];
    if (!g.label || !Array.isArray(g.indices)) continue;

    const { data: groupInsert } = await sb
      .from("groups")
      .insert({ session_id: sessionId, label: g.label, sort_order: i })
      .select()
      .single();
    if (!groupInsert) continue;
    const groupRow = groupInsert as { id: string };

    const responseIds = g.indices
      .map((idx) => responses[idx - 1]?.id)
      .filter((id): id is string => typeof id === "string");
    if (responseIds.length > 0) {
      await sb
        .from("responses")
        .update({ group_id: groupRow.id })
        .in("id", responseIds);
    }
  }

  return NextResponse.json({ ok: true, group_count: parsed.groups.length });
}
