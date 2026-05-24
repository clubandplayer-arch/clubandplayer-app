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

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

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

    const body = await req.json();
    const registryMasterId =
      clean(body.registry_master_id) || clean(body.registry_club_id);

    if (!registryMasterId) {
      return NextResponse.json(
        { ok: false, error: "Missing registry_master_id" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, account_type, type")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          ok: false,
          error: profileError?.message || "Profile not found",
        },
        { status: 404 }
      );
    }

    const accountType = String(
      profile.account_type || profile.type || ""
    ).toLowerCase();

    if (accountType !== "club") {
      return NextResponse.json(
        {
          ok: false,
          error: "Solo i profili Club possono rivendicare una società.",
        },
        { status: 403 }
      );
    }

    const { data: registryClub, error: registryClubError } = await supabaseAdmin
      .from("registry_clubs_master")
      .select("master_id, is_claimed")
      .eq("master_id", registryMasterId)
      .maybeSingle();

    if (registryClubError || !registryClub) {
      return NextResponse.json(
        {
          ok: false,
          error: registryClubError?.message || "Società non trovata.",
        },
        { status: 404 }
      );
    }

    if (registryClub.is_claimed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Questa società risulta già rivendicata.",
        },
        { status: 409 }
      );
    }

    const { data: existingClaim } = await supabaseAdmin
      .from("registry_claims")
      .select("id, claim_status")
      .eq("registry_master_id", registryMasterId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (existingClaim) {
      return NextResponse.json({
        ok: true,
        claim: existingClaim,
        already_exists: true,
      });
    }

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("registry_claims")
      .insert({
        registry_master_id: registryMasterId,
        registry_club_id: null,
        profile_id: profile.id,
        claim_status: "pending",
        claim_method: "self_service",
      })
      .select("id, claim_status, submitted_at, registry_master_id")
      .single();

    if (claimError) {
      return NextResponse.json(
        { ok: false, error: claimError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      claim,
    });
  } catch (err) {
    console.error("REGISTRY CLAIM ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}