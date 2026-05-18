import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  CanvasParticipantRow,
  CanvasRow,
  LifecycleSubmissionRow,
  SynthesisResult,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars on server");
  return createClient(url, key, { auth: { persistSession: false } });
}

interface Body {
  facilitatorToken: string;
}

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text?: string; error?: string; status?: number }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error", res.status, errText);
      return { error: `Anthropic ${res.status}: ${errText.slice(0, 300)}`, status: 502 };
    }
    const data = await res.json();
    const text = (data?.content?.[0]?.text as string | undefined) ?? "";
    if (!text) return { error: "Empty LLM response from Anthropic", status: 502 };
    return { text };
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-4.6";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/joeyunnold-ml/KO_tools",
        "X-Title": "Experiment Lifecycle Canvas",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenRouter error", res.status, errText);
      return { error: `OpenRouter ${res.status}: ${errText.slice(0, 300)}`, status: 502 };
    }
    const data = await res.json();
    const text = (data?.choices?.[0]?.message?.content as string | undefined) ?? "";
    if (!text) return { error: "Empty LLM response from OpenRouter", status: 502 };
    return { text };
  }

  return {
    error: "No LLM credentials configured (set ANTHROPIC_API_KEY or OPENROUTER_API_KEY)",
    status: 503,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ canvasId: string }> },
) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "No LLM credentials configured — set ANTHROPIC_API_KEY or OPENROUTER_API_KEY" },
      { status: 503 },
    );
  }

  const { canvasId } = await params;
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.facilitatorToken) {
    return NextResponse.json({ error: "Missing facilitatorToken" }, { status: 400 });
  }

  const sb = admin();

  // Validate facilitator token
  const { data: canvasData } = await sb
    .from("canvases")
    .select("*")
    .eq("id", canvasId)
    .maybeSingle();
  const canvas = canvasData as CanvasRow | null;
  if (!canvas) return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
  if (canvas.facilitator_token !== body.facilitatorToken) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Fetch submissions + participants
  const [subsRes, partsRes] = await Promise.all([
    sb.from("lifecycle_submissions").select("*").eq("canvas_id", canvasId).order("submitted_at"),
    sb.from("canvas_participants").select("*").eq("canvas_id", canvasId),
  ]);
  const submissions = (subsRes.data ?? []) as LifecycleSubmissionRow[];
  const participants = (partsRes.data ?? []) as CanvasParticipantRow[];
  const participantsById = new Map(participants.map((p) => [p.id, p]));

  if (submissions.length === 0) {
    return NextResponse.json({ error: "No submissions to synthesize" }, { status: 400 });
  }

  // Build prompts
  const systemPrompt = `You are helping a facilitation team synthesize individual responses into a shared experiment lifecycle framework. You will receive ordered lists of lifecycle stages from multiple workshop participants.

Your job:
1. Identify the common stages across submissions. Normalize naming differences (e.g., 'Launch' and 'Deploy' and 'Go live' are the same stage).
2. Produce a single unified ordered list of 5-9 stages that best represents the group's collective mental model.
3. If there are stages that only 1-2 people mentioned, include them but flag them as 'mentioned by few' — these are discussion points, not automatic inclusions.
4. Write a 2-3 sentence synthesis note highlighting where the group agreed, where they diverged, and any interesting gaps (e.g., 'No one mentioned a stage for moving winning experiments into production code').

Respond ONLY in JSON, no markdown fences, no preamble:
{
  "stages": [
    { "label": "string", "confidence": "high|medium|low", "source_count": number }
  ],
  "narrative": "string",
  "divergences": [
    { "description": "string" }
  ]
}

'confidence' reflects how consistently this stage appeared across submissions:
- high: mentioned by most participants (>60%)
- medium: mentioned by some (30-60%)
- low: mentioned by few (<30%)`;

  const userPrompt = `Here are the individual submissions from ${submissions.length} participants:

${submissions
  .map((s, i) => {
    const name = participantsById.get(s.participant_id)?.name ?? "anon";
    const stages = Array.isArray(s.stages) ? s.stages : [];
    return `Participant ${i + 1} (${name}): ${stages.join(" → ")}`;
  })
  .join("\n")}`;

  let llmText: string;
  try {
    const result = await callLLM(systemPrompt, userPrompt);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
    }
    llmText = result.text ?? "";
  } catch (e) {
    return NextResponse.json(
      { error: `LLM request failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 502 },
    );
  }

  // Parse JSON
  let parsed: SynthesisResult;
  try {
    const cleaned = llmText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned) as SynthesisResult;
  } catch (e) {
    console.error("Failed to parse LLM JSON", llmText);
    return NextResponse.json(
      { error: `LLM returned invalid JSON: ${e instanceof Error ? e.message : "parse error"}` },
      { status: 502 },
    );
  }

  if (!Array.isArray(parsed?.stages)) {
    return NextResponse.json({ error: "LLM response missing 'stages' array" }, { status: 502 });
  }

  // Store result + advance phase
  const { error: updateErr } = await sb
    .from("canvases")
    .update({ synthesis_result: parsed, phase: "synthesize" })
    .eq("id", canvasId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stages: parsed.stages.length });
}
