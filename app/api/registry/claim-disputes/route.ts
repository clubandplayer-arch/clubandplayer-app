import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const registryClubId =
      typeof body?.registry_club_id === "string" ? body.registry_club_id : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!registryClubId) {
      return NextResponse.json(
        { ok: false, error: "Società Registro CONI non valida." },
        { status: 400 }
      );
    }

    if (reason.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error: "Inserisci una motivazione di almeno 20 caratteri.",
        },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, account_type, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 }
      );
    }

    const profileId = profile?.id ? String(profile.id) : "";
    const accountType = String(
      profile?.account_type || profile?.type || ""
    ).toLowerCase();

    if (!profileId || accountType !== "club") {
      return NextResponse.json(
        { ok: false, error: "Solo un profilo Club può aprire un reclamo." },
        { status: 403 }
      );
    }

    const { data: registryClub, error: clubError } = await supabaseAdmin
      .from("registry_clubs")
      .select("id, claim_status, claimed_by_profile_id")
      .eq("id", registryClubId)
      .maybeSingle();

    if (clubError) {
      return NextResponse.json(
        { ok: false, error: clubError.message },
        { status: 500 }
      );
    }

    if (!registryClub) {
      return NextResponse.json(
        { ok: false, error: "Società Registro CONI non trovata." },
        { status: 404 }
      );
    }

    const currentOwnerId = registryClub.claimed_by_profile_id
      ? String(registryClub.claimed_by_profile_id)
      : null;

    if (registryClub.claim_status !== "claimed" || !currentOwnerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Questa società non risulta rivendicata da un altro profilo.",
        },
        { status: 409 }
      );
    }

    if (currentOwnerId === profileId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Questa società è già collegata al tuo profilo Club.",
        },
        { status: 409 }
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("registry_claim_disputes")
      .select("id, status")
      .eq("registry_club_id", registryClubId)
      .eq("claimant_profile_id", profileId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: existingError.message },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        dispute: existing,
      });
    }

    const now = new Date().toISOString();

    const { data: dispute, error: insertError } = await supabaseAdmin
      .from("registry_claim_disputes")
      .insert({
        registry_club_id: registryClubId,
        claimant_profile_id: profileId,
        current_claimed_by_profile_id: currentOwnerId,
        reason,
        status: "pending",
        created_at: now,
        updated_at: now,
      })
      .select("id, status, created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      dispute,
    });
  } catch (err) {
    console.error("REGISTRY CLAIM DISPUTE CREATE ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}