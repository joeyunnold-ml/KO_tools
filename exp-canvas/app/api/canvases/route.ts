import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CanvasRow } from "@/lib/types";

export const runtime = "nodejs";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars on server");
  return createClient(url, key, { auth: { persistSession: false } });
}

function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST() {
  const sb = admin();

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await sb
      .from("canvases")
      .insert({ room_code: code, phase: "lobby" })
      .select()
      .single();

    if (!error && data) {
      const row = data as CanvasRow;
      return NextResponse.json({
        id: row.id,
        room_code: row.room_code,
        facilitator_token: row.facilitator_token,
        phase: row.phase,
      });
    }

    if (error && (error as { code?: string }).code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Could not generate unique room code" }, { status: 500 });
}
