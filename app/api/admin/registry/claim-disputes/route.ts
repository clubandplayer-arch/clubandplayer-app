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

async function requireAdmin(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      supabaseAdmin,
      user: null,
      response: NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      supabaseAdmin,
      user: null,
      response: NextResponse.json(
        { ok: false, error: "Invalid session" },
        { status: 401 }
      ),
    };
  }

  const isAdmin = await isAdminUser(supabaseAdmin, user);

  if (!isAdmin) {
    return {
      supabaseAdmin,
      user,
      response: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { supabaseAdmin, user, response: null };
}

export async function GET(req: NextRequest) {
  try {
    const { supabaseAdmin, response } = await requireAdmin(req);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";

    const { data: disputes, error: disputesError } = await supabaseAdmin
      .from("registry_claim_disputes")
      .select(
        "id, registry_club_id, claimant_profile_id, current_claimed_by_profile_id, reason, status, admin_notes, created_at, updated_at, reviewed_at"
      )
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (disputesError) {
      return NextResponse.json(
        { ok: false, error: disputesError.message },
        { status: 500 }
      );
    }

    const rows = disputes ?? [];

    const registryClubIds = Array.from(
      new Set(rows.map((row) => String(row.registry_club_id)).filter(Boolean))
    );
    const profileIds = Array.from(
      new Set(
        rows
          .flatMap((row) => [
            row.claimant_profile_id,
            row.current_claimed_by_profile_id,
          ])
          .map((id) => (id ? String(id) : ""))
          .filter(Boolean)
      )
    );

    const clubById = new Map<string, any>();
    const profileById = new Map<string, any>();

    if (registryClubIds.length) {
      const { data: clubs, error: clubsError } = await supabaseAdmin
        .from("registry_clubs")
        .select("id, source_club_id, name, region, province, municipality")
        .in("id", registryClubIds);

      if (clubsError) {
        return NextResponse.json(
          { ok: false, error: clubsError.message },
          { status: 500 }
        );
      }

      (clubs ?? []).forEach((club) => clubById.set(String(club.id), club));
    }

    if (profileIds.length) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, account_type, type")
        .in("id", profileIds);

      if (profilesError) {
        return NextResponse.json(
          { ok: false, error: profilesError.message },
          { status: 500 }
        );
      }

      (profiles ?? []).forEach((profile) =>
        profileById.set(String(profile.id), profile)
      );
    }

    const items = rows.map((row) => ({
      ...row,
      registry_clubs: clubById.get(String(row.registry_club_id)) ?? null,
      claimant_profile: profileById.get(String(row.claimant_profile_id)) ?? null,
      current_owner_profile: row.current_claimed_by_profile_id
        ? profileById.get(String(row.current_claimed_by_profile_id)) ?? null
        : null,
    }));

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (err) {
    console.error("ADMIN REGISTRY CLAIM DISPUTES GET ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabaseAdmin, user, response } = await requireAdmin(req);
    if (response) return response;

    const body = await req.json().catch(() => null);
    const disputeId = typeof body?.id === "string" ? body.id : "";
    const action = typeof body?.action === "string" ? body.action : "";
    const adminNotes =
      typeof body?.admin_notes === "string" ? body.admin_notes.trim() : null;

    if (!disputeId || !["accepted", "rejected"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Payload reclamo non valido." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: dispute, error: updateError } = await supabaseAdmin
      .from("registry_claim_disputes")
      .update({
        status: action,
        admin_notes: adminNotes,
        reviewed_at: now,
        reviewed_by_profile_id: user?.id ?? null,
        updated_at: now,
      })
      .eq("id", disputeId)
      .eq("status", "pending")
      .select("id, status, reviewed_at")
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      dispute,
    });
  } catch (err) {
    console.error("ADMIN REGISTRY CLAIM DISPUTES PATCH ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}