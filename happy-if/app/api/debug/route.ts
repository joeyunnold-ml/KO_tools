import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Diagnostic endpoint. Returns which LLM provider env vars are visible to
 * this function instance, along with deployment metadata. Returns booleans
 * only — no key material is exposed.
 *
 * Hit this with a browser at /api/debug to confirm whether Anthropic /
 * OpenRouter env vars are reaching the running function.
 */
export async function GET() {
  return NextResponse.json({
    anthropic_key_present: !!process.env.ANTHROPIC_API_KEY,
    anthropic_key_length: process.env.ANTHROPIC_API_KEY?.length ?? 0,
    anthropic_model: process.env.ANTHROPIC_MODEL ?? "(unset, will default to claude-opus-4-7)",
    openrouter_key_present: !!process.env.OPENROUTER_API_KEY,
    openrouter_key_length: process.env.OPENROUTER_API_KEY?.length ?? 0,
    openrouter_model: process.env.OPENROUTER_MODEL ?? "(unset)",
    supabase_url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Vercel-provided runtime metadata
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "(not on Vercel)",
    commit_message: process.env.VERCEL_GIT_COMMIT_MESSAGE?.slice(0, 80) ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    vercel_env: process.env.VERCEL_ENV ?? "(local)",
    deployment_url: process.env.VERCEL_URL ?? null,
    // Which provider would the cluster route pick?
    selected_provider: process.env.ANTHROPIC_API_KEY
      ? "anthropic"
      : process.env.OPENROUTER_API_KEY
        ? "openrouter"
        : "none",
  });
}
