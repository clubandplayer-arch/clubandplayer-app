import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { isAdminUser } from "@/lib/api/admin";

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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const isAdmin = await isAdminUser(supabaseAdmin, user);

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const params = await context.params;
    const claimId = params.id;

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("registry_claims")
      .select("id, profile_id, registry_club_id, registry_master_id, claim_status")
      .eq("id", claimId)
      .maybeSingle();

    if (claimError) {
      console.error("REGISTRY CLAIM APPROVE SELECT ERROR", claimError);

      return NextResponse.json(
        { ok: false, error: claimError.message },
        { status: 500 }
      );
    }

    if (!claim) {
      return NextResponse.json(
        { ok: false, error: "Claim not found" },
        { status: 404 }
      );
    }

    if (!["pending", "in_review", "claim_pending"].includes(claim.claim_status)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Claim non approvabile nello stato attuale: ${claim.claim_status}`,
        },
        { status: 409 }
      );
    }

    if (!claim.registry_master_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Claim senza registry_master_id. Impossibile approvare sul Registry V2.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: updatedClaim, error: updateClaimError } = await supabaseAdmin
      .from("registry_claims")
      .update({
        claim_status: "approved",
        approved_at: now,
        rejected_at: null,
        updated_at: now,
      })
      .eq("id", claim.id)
      .select("id, profile_id, registry_club_id, registry_master_id, claim_status, approved_at")
      .single();

    if (updateClaimError) {
      console.error("REGISTRY CLAIM APPROVE UPDATE CLAIM ERROR", updateClaimError);

      return NextResponse.json(
        { ok: false, error: updateClaimError.message },
        { status: 500 }
      );
    }

    const { data: updatedClub, error: updateClubError } = await supabaseAdmin
      .from("registry_clubs_master")
      .update({
        is_claimed: true,
        claimed_profile_id: claim.profile_id,
        updated_at: now,
      })
      .eq("master_id", claim.registry_master_id)
      .select("master_id, is_claimed, claimed_profile_id, updated_at")
      .single();

    if (updateClubError) {
      console.error("REGISTRY CLAIM APPROVE UPDATE MASTER CLUB ERROR", updateClubError);

      return NextResponse.json(
        { ok: false, error: updateClubError.message },
        { status: 500 }
      );
    }

    const { error: linkProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        registry_master_id: claim.registry_master_id,
        club_name_review_status: "approved",
        club_name_review_reason: null,
        club_name_reviewed_at: now,
        club_name_reviewed_by: user.id,
        updated_at: now,
      })
      .eq("id", claim.profile_id);

    if (linkProfileError) {
      console.error("REGISTRY CLAIM APPROVE LINK PROFILE ERROR", linkProfileError);
      return NextResponse.json(
        { ok: false, error: `Claim approvato ma collegamento profilo fallito: ${linkProfileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      approved: true,
      claim: updatedClaim,
      club: updatedClub,
    });
  } catch (err) {
    console.error("REGISTRY CLAIM APPROVE ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
