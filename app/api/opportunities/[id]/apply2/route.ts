export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PlayingCategory = "male" | "female" | "mixed" | null;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServerClient();

  // Auth
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = auth.user.id;

  // <-- differenza chiave in Next 15: params è una Promise
  const { id: opportunityId } = await context.params;

  // Profilo atleta
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id,type,playing_category")
    .eq("id", userId)
    .single();

  if (profErr || !profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }
  if (profile.type !== "athlete") {
    return NextResponse.json({ error: "forbidden_not_athlete" }, { status: 403 });
  }

  const athleteCategory = (profile.playing_category as PlayingCategory) ?? null;

  // Opportunità
  const { data: opp, error: oppErr } = await supabase
    .from("opportunities")
    .select("id, required_category")
    .eq("id", opportunityId)
    .single();

  if (oppErr || !opp) {
    return NextResponse.json({ error: "opportunity_not_found" }, { status: 404 });
  }

  const required = (opp.required_category as PlayingCategory) ?? null;

  // Regola candidatura:
  // ok se required è null (tutti), mixed, o uguale alla categoria atleta
  const ok =
    required === null ||
    required === "mixed" ||
    (athleteCategory !== null && athleteCategory === required);

  if (!ok) {
    return NextResponse.json(
      {
        error: "category_mismatch",
        message:
          "Questa opportunità non accetta la tua categoria di gioco. Aggiorna il profilo o scegli un annuncio compatibile.",
      },
      { status: 403 }
    );
  }

  // Evita duplicati
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("athlete_id", userId)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, alreadyApplied: true, id: existing.id });
  }

  // Body opzionale (note)
  const body = await safeJson(req);
  const note = (body?.note as string | undefined) ?? null;

  // Crea candidatura
  const { data: created, error: insErr } = await supabase
    .from("applications")
    .insert({
      athlete_id: userId,
      opportunity_id: opportunityId,
      note,
    })
    .select("id")
    .single();

  if (insErr || !created) {
    return NextResponse.json({ error: insErr?.message || "apply_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: created.id });
}

// Helpers
async function safeJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
