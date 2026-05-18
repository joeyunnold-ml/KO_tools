import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  AnalysisResult,
  LaneClassificationRow,
  LaneItemRow,
  LaneParticipantRow,
  LaneSessionRow,
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
        "X-Title": "Three-Lane Framework",
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
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "No LLM credentials configured — set ANTHROPIC_API_KEY or OPENROUTER_API_KEY" },
      { status: 503 },
    );
  }

  const { sessionId } = await params;
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
  const { data: sessionData } = await sb
    .from("lane_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  const session = sessionData as LaneSessionRow | null;
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.facilitator_token !== body.facilitatorToken) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Mark phase = analyze so clients see the in-flight state immediately
  await sb.from("lane_sessions").update({ phase: "analyze" }).eq("id", sessionId);

  // Fetch items, participants, classifications
  const [itemsRes, partsRes, classRes] = await Promise.all([
    sb.from("lane_items").select("*").eq("session_id", sessionId).order("sort_order"),
    sb.from("lane_participants").select("*").eq("session_id", sessionId),
    sb.from("lane_classifications").select("*").eq("session_id", sessionId),
  ]);
  const items = (itemsRes.data ?? []) as LaneItemRow[];
  const participants = (partsRes.data ?? []) as LaneParticipantRow[];
  const classifications = (classRes.data ?? []) as LaneClassificationRow[];
  const realParticipants = participants.filter((p) => !p.is_facilitator);
  const participantsById = new Map(realParticipants.map((p) => [p.id, p]));

  if (items.length === 0) {
    return NextResponse.json({ error: "No items to analyze" }, { status: 400 });
  }
  if (classifications.length === 0) {
    return NextResponse.json({ error: "No classifications to analyze" }, { status: 400 });
  }

  // Build prompt with the session's framing-specific lane labels
  const laneA = `${session.lane_a_label} (lane id: fix)`;
  const laneB = `${session.lane_b_label} (lane id: test)`;
  const laneC = `${session.lane_c_label} (lane id: build)`;
  const systemPrompt = `You are analyzing classification data from a workshop exercise. A group of participants independently sorted work items into three categories:
- ${laneA}: ${session.lane_a_description}
- ${laneB}: ${session.lane_b_description}
- ${laneC}: ${session.lane_c_description}

In the JSON output you produce, ALWAYS use the lane ids 'fix', 'test', 'build' (not the human-readable labels). The labels above are just so you understand what each lane means.

Your job:
1. Identify consensus items (>=70% agreement on one lane).
2. Identify contested items (<70% agreement). Rank them by disagreement (most evenly split first).
3. For each contested item, write a 1-sentence discussion prompt that names the specific tension. Don't just state the numbers — frame WHY the disagreement matters. Examples:
   - 'The Fix/Test split suggests disagreement about whether there's a known right answer or a genuine hypothesis here.'
   - 'The Test/Build split suggests this might be too large for an experiment and may need product scoping first.'
   - 'The even three-way split suggests this item may not be well-defined enough to classify — it might need to be broken into smaller pieces.'
4. Look for patterns across all items:
   - Does one team (Monstarlab vs Avis) consistently classify differently?
   - Are certain item types (UX issues vs process gaps vs feature ideas) consistently contested?
   - Is there a general skew toward one lane?
   Write 1-2 pattern observations if they exist. If nothing jumps out, return an empty array.

Respond ONLY in JSON, no markdown fences, no preamble:
{
  "consensus": [
    { "item_id": "string", "lane": "fix|test|build", "agreement_pct": number }
  ],
  "contested": [
    {
      "item_id": "string",
      "distribution": { "fix": number, "test": number, "build": number },
      "discussion_prompt": "string"
    }
  ],
  "patterns": [
    { "observation": "string" }
  ]
}

Use the exact item_id values provided in the user message.`;

  // Group classifications by item
  const classesByItem = new Map<string, LaneClassificationRow[]>();
  for (const c of classifications) {
    if (!classesByItem.has(c.item_id)) classesByItem.set(c.item_id, []);
    classesByItem.get(c.item_id)!.push(c);
  }

  const lines: string[] = [
    `Total participants: ${realParticipants.length}`,
    `Total items: ${items.length}`,
    "",
  ];
  for (const item of items) {
    const cls = classesByItem.get(item.id) ?? [];
    if (cls.length === 0) continue;
    lines.push(`Item id: ${item.id}`);
    lines.push(`Title: "${item.title}"`);
    if (item.description) lines.push(`Description: ${item.description}`);
    const classifierLine = cls
      .map((c) => {
        const p = participantsById.get(c.participant_id);
        if (!p) return null;
        return `${p.name} (${p.team}): ${c.lane}`;
      })
      .filter(Boolean)
      .join(", ");
    lines.push(`Classifications: ${classifierLine}`);
    lines.push("");
  }
  const userPrompt = lines.join("\n");

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

  let parsed: AnalysisResult;
  try {
    const cleaned = llmText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned) as AnalysisResult;
  } catch (e) {
    console.error("Failed to parse LLM JSON", llmText);
    return NextResponse.json(
      { error: `LLM returned invalid JSON: ${e instanceof Error ? e.message : "parse error"}` },
      { status: 502 },
    );
  }

  if (!Array.isArray(parsed?.consensus) || !Array.isArray(parsed?.contested)) {
    return NextResponse.json(
      { error: "LLM response missing required fields" },
      { status: 502 },
    );
  }

  // Auto-fill final_lane for consensus items so the export already has them
  for (const c of parsed.consensus) {
    if (c.item_id && c.lane) {
      await sb.from("lane_items").update({ final_lane: c.lane }).eq("id", c.item_id);
    }
  }

  const { error: updateErr } = await sb
    .from("lane_sessions")
    .update({ analysis_result: parsed, phase: "results" })
    .eq("id", sessionId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    consensus_count: parsed.consensus.length,
    contested_count: parsed.contested.length,
  });
}
