import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  ParticipantRow,
  QuestionRow,
  ResponseRow,
  SessionRow,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars on server");
  return createClient(url, key, { auth: { persistSession: false } });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface ClusterRequest {
  sessionId: string;
  questionId: string;
  facilitatorToken: string;
  force?: boolean;
}

interface LLMItem {
  index: number;
  summary: string;
}

interface LLMCluster {
  label: string;
  items: LLMItem[];
}

interface LLMResponse {
  groups: LLMCluster[];
  unclustered?: LLMItem[];
}

async function callLLM(prompt: string): Promise<{ text?: string; error?: string; status?: number }> {
  // Prefer Anthropic direct when ANTHROPIC_API_KEY is set; fall back to
  // OpenRouter for the legacy path. Either env var is sufficient on its own.
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
        messages: [{ role: "user", content: prompt }],
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
        "X-Title": "Happy If Workshop Tool",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
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

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "No LLM credentials configured — set ANTHROPIC_API_KEY or OPENROUTER_API_KEY" },
      { status: 503 },
    );
  }

  let body: ClusterRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { sessionId, questionId, facilitatorToken, force } = body;
  if (!sessionId || !questionId || !facilitatorToken) {
    return NextResponse.json(
      { error: "Missing sessionId, questionId, or facilitatorToken" },
      { status: 400 },
    );
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

  // 2. Get the question text for the prompt
  const { data: questionData } = await sb
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();
  const question = questionData as QuestionRow | null;
  if (!question || question.session_id !== sessionId) {
    return NextResponse.json({ error: "Question not found in this session" }, { status: 404 });
  }

  // 3. Skip if already clustered for this question (unless force=true)
  const { data: existingGroups } = await sb
    .from("groups")
    .select("id")
    .eq("session_id", sessionId)
    .eq("question_id", questionId);
  if (existingGroups && existingGroups.length > 0 && !force) {
    return NextResponse.json({ ok: true, skipped: "groups_exist", group_count: existingGroups.length });
  }

  // 4. Fetch responses (filtered to this question) + participants
  const [responsesRes, participantsRes] = await Promise.all([
    sb
      .from("responses")
      .select("*")
      .eq("session_id", sessionId)
      .eq("question_id", questionId)
      .order("created_at"),
    sb.from("participants").select("*").eq("session_id", sessionId),
  ]);
  const responses = (responsesRes.data ?? []) as ResponseRow[];
  const participants = (participantsRes.data ?? []) as ParticipantRow[];

  if (responses.length === 0) {
    return NextResponse.json({ ok: true, group_count: 0, message: "No responses to cluster" });
  }

  const participantsById = new Map(participants.map((p) => [p.id, p]));

  const lines = responses.map((r, i) => {
    const p = participantsById.get(r.participant_id);
    const name = p?.name ?? "anon";
    return `[${i + 1}] ${name}: "${r.text}"`;
  });

  const prompt = `You are clustering responses from a workshop kickoff. The prompt was:

"${question.text}"

Participant responses (the bracketed numbers are stable IDs you must reference):

${lines.join("\n")}

Your task: group these responses into 3-6 themed clusters AND give each response a short summary chip.

Rules:
- Each cluster gets a short, descriptive label (2-5 words, Title Case)
- Use neutral, professional language (e.g., "Conversion Recovery", "Team Velocity", "Process Clarity")
- Each response gets an "abbreviated label" — a 2-6 word punchy summary capturing the essence of that specific response (Title Case or sentence case, no quotes)
- Group thematically similar responses together
- Use "unclustered" sparingly — only for responses that genuinely don't fit anywhere
- Every response index must appear exactly once across "groups" and "unclustered"
- Aim for clusters of roughly similar size (3-6 ideal); avoid singleton clusters unless the response is a true outlier

Respond with ONLY valid JSON, no markdown fences, no preamble:

{
  "groups": [
    {
      "label": "Conversion Recovery",
      "items": [
        {"index": 1, "summary": "Back to pre-replatform baseline"},
        {"index": 4, "summary": "$500K incremental revenue"}
      ]
    }
  ],
  "unclustered": [
    {"index": 7, "summary": "Lone outlier example"}
  ]
}`;

  let llmResponseText: string;
  try {
    const result = await callLLM(prompt);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
    }
    llmResponseText = result.text ?? "";
  } catch (e) {
    return NextResponse.json(
      { error: `LLM request failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 502 },
    );
  }

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

  // Clear existing groups for THIS question if force=true
  if (force && existingGroups && existingGroups.length > 0) {
    await sb.from("groups").delete().eq("session_id", sessionId).eq("question_id", questionId);
    await sb
      .from("responses")
      .update({ group_id: null })
      .eq("session_id", sessionId)
      .eq("question_id", questionId);
  }

  // Insert groups (staggered for streaming UX), each tagged with question_id
  const groupRows: Array<{ id: string; items: LLMItem[] }> = [];
  for (let i = 0; i < parsed.groups.length; i++) {
    const g = parsed.groups[i];
    if (!g.label || !Array.isArray(g.items)) continue;

    const { data: groupInsert } = await sb
      .from("groups")
      .insert({
        session_id: sessionId,
        question_id: questionId,
        label: g.label,
        sort_order: i,
      })
      .select()
      .single();
    if (!groupInsert) continue;
    const groupRow = groupInsert as { id: string };
    groupRows.push({ id: groupRow.id, items: g.items });

    await delay(250 + Math.floor(Math.random() * 200));
  }

  // Assign responses one at a time, interleaved across groups
  const queue: Array<{ groupId: string; item: LLMItem }> = [];
  const maxItems = Math.max(...groupRows.map((g) => g.items.length), 0);
  for (let i = 0; i < maxItems; i++) {
    for (const gr of groupRows) {
      const item = gr.items[i];
      if (item) queue.push({ groupId: gr.id, item });
    }
  }

  for (const { groupId, item } of queue) {
    const responseId = responses[item.index - 1]?.id;
    if (!responseId) continue;
    await sb
      .from("responses")
      .update({ group_id: groupId, summary: item.summary ?? null })
      .eq("id", responseId);
    await delay(180 + Math.floor(Math.random() * 280));
  }

  // Unclustered summaries
  for (const item of parsed.unclustered ?? []) {
    const responseId = responses[item.index - 1]?.id;
    if (!responseId) continue;
    await sb
      .from("responses")
      .update({ summary: item.summary ?? null })
      .eq("id", responseId);
  }

  return NextResponse.json({ ok: true, group_count: parsed.groups.length });
}
