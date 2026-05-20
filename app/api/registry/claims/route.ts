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
    const registryClubId = String(body.registry_club_id || "");

    if (!registryClubId) {
      return NextResponse.json(
        { ok: false, error: "Missing registry_club_id" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, account_type")
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

    if (profile.account_type !== "club") {
      return NextResponse.json(
        {
          ok: false,
          error: "Solo i profili Club possono rivendicare una società.",
        },
        { status: 403 }
      );
    }

    const { data: existingClaim } = await supabaseAdmin
      .from("registry_claims")
      .select("id, claim_status")
      .eq("registry_club_id", registryClubId)
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
        registry_club_id: registryClubId,
        profile_id: profile.id,
        claim_status: "pending",
        claim_method: "self_service",
      })
      .select("id, claim_status, submitted_at")
      .single();

    if (claimError) {
      return NextResponse.json(
        { ok: false, error: claimError.message },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("registry_clubs")
      .update({
        claim_status: "claim_pending",
      })
      .eq("id", registryClubId)
      .eq("claim_status", "not_claimed");

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