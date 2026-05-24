import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { isAdminUser } from "@/lib/api/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistryClaimRow = {
  id: string;
  claim_status: string;
  submitted_at: string;
  profile_id: string;
  registry_club_id: string | null;
  registry_master_id: string | null;
};

type RegistryMasterRow = {
  master_id: string;
  denominazione: string;
  regione: string | null;
  provincia: string | null;
  comune: string | null;
  sport_normalizzati: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  account_type: string | null;
};

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

export async function GET(req: NextRequest) {
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

    const { data: claimsData, error } = await supabaseAdmin
      .from("registry_claims")
      .select(
        `
        id,
        claim_status,
        submitted_at,
        profile_id,
        registry_club_id,
        registry_master_id
      `
      )
      .in("claim_status", ["pending", "claim_pending", "in_review"])
      .order("submitted_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const claims = (claimsData || []) as RegistryClaimRow[];

    const masterIds = Array.from(
      new Set(
        claims
          .map((claim) => clean(claim.registry_master_id))
          .filter(Boolean)
      )
    );

    const profileIds = Array.from(
      new Set(claims.map((claim) => clean(claim.profile_id)).filter(Boolean))
    );

    let masterById = new Map<string, RegistryMasterRow>();
    let profileById = new Map<string, ProfileRow>();

    if (masterIds.length) {
      const { data: mastersData, error: mastersError } = await supabaseAdmin
        .from("registry_clubs_master")
        .select(
          `
          master_id,
          denominazione,
          regione,
          provincia,
          comune,
          sport_normalizzati
        `
        )
        .in("master_id", masterIds);

      if (mastersError) {
        return NextResponse.json(
          { ok: false, error: mastersError.message },
          { status: 500 }
        );
      }

      masterById = new Map(
        ((mastersData || []) as RegistryMasterRow[]).map((row) => [
          row.master_id,
          row,
        ])
      );
    }

    if (profileIds.length) {
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, account_type")
        .in("id", profileIds);

      if (profilesError) {
        return NextResponse.json(
          { ok: false, error: profilesError.message },
          { status: 500 }
        );
      }

      profileById = new Map(
        ((profilesData || []) as ProfileRow[]).map((row) => [row.id, row])
      );
    }

    const items = claims.map((claim) => {
      const master = claim.registry_master_id
        ? masterById.get(claim.registry_master_id) ?? null
        : null;

      const profile = profileById.get(claim.profile_id) ?? null;

      return {
        ...claim,
        registry_clubs: master
          ? {
              name: master.denominazione,
              source_club_id: "",
              region: master.regione,
              province: master.provincia,
              municipality: master.comune,
              sport_normalizzati: master.sport_normalizzati,
            }
          : null,
        profiles: profile,
      };
    });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (err) {
    console.error("ADMIN REGISTRY CLAIMS ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}