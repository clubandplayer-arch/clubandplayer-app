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
      .select(`
        id,
        registry_club_id
      `)
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { ok: false, error: "Claim not found" },
        { status: 404 }
      );
    }

    await supabaseAdmin
      .from("registry_claims")
      .update({
        claim_status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by_profile_id: user.id,
      })
      .eq("id", claim.id);

    await supabaseAdmin
      .from("registry_clubs")
      .update({
        claim_status: "not_claimed",
      })
      .eq("id", claim.registry_club_id);

    return NextResponse.json({
      ok: true,
      rejected: true,
    });
  } catch (err) {
    console.error("REGISTRY CLAIM REJECT ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}