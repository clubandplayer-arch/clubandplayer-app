import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistryMasterRow = {
  master_id: string;
  denominazione: string;
  regione: string | null;
  provincia: string | null;
  comune: string | null;
  sport_normalizzati: string | null;
  is_claimed: boolean | null;
};

type RegistryClaimRow = {
  registry_master_id: string | null;
  claim_status: string | null;
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

function clean(value: string | null) {
  return String(value || "").trim();
}

function sportsToDisciplines(sportNormalizzati: string | null) {
  return clean(sportNormalizzati)
    .split("|")
    .map((sport) => sport.trim())
    .filter(Boolean)
    .map((sport) => ({
      clubandplayer_sport: sport,
      discipline_raw: sport,
    }));
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);

    const q = clean(searchParams.get("q"));
    const region = clean(searchParams.get("region"));
    const province = clean(searchParams.get("province"));
    const sport = clean(searchParams.get("sport"));

    let query = supabase
      .from("registry_clubs_master")
      .select(
        `
        master_id,
        denominazione,
        regione,
        provincia,
        comune,
        sport_normalizzati,
        is_claimed
      `
      )
      .order("denominazione", { ascending: true })
      .limit(50);

    if (q) {
      query = query.ilike("denominazione", `%${q}%`);
    }

    if (region) {
      query = query.eq("regione", region);
    }

    if (province) {
      query = query.eq("provincia", province);
    }

    if (sport) {
      query = query.ilike("sport_normalizzati", `%${sport}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("REGISTRY MASTER SEARCH ERROR", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const rows = (data || []) as RegistryMasterRow[];
    const masterIds = rows.map((row) => row.master_id).filter(Boolean);

    let pendingMasterIds = new Set<string>();

    if (masterIds.length) {
      const { data: pendingRows, error: pendingError } = await supabase
        .from("registry_claims")
        .select("registry_master_id, claim_status")
        .in("registry_master_id", masterIds)
        .in("claim_status", ["pending", "in_review"]);

      if (pendingError) {
        console.error("REGISTRY MASTER PENDING SEARCH ERROR", pendingError);
      } else {
        pendingMasterIds = new Set(
          ((pendingRows || []) as RegistryClaimRow[])
            .map((row) => clean(row.registry_master_id))
            .filter(Boolean)
        );
      }
    }

    const items = rows.map((row) => {
      const masterId = row.master_id;
      const isClaimed = Boolean(row.is_claimed);
      const isPending = pendingMasterIds.has(masterId);

      return {
        id: masterId,
        registry_master_id: masterId,
        master_id: masterId,
        source_club_id: "",
        name: row.denominazione,
        normalized_name: row.denominazione,
        region: row.regione,
        province: row.provincia,
        municipality: row.comune,
        claim_status: isClaimed
          ? "claimed"
          : isPending
            ? "claim_pending"
            : "not_claimed",
        registry_club_disciplines: sportsToDisciplines(row.sport_normalizzati),
      };
    });

    return NextResponse.json({
      ok: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("REGISTRY MASTER SEARCH FATAL ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}