import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/api/rateLimit";

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
  claimed_profile_id: string | null;
};

type RegistryClaimRow = {
  registry_master_id: string | null;
  claim_status: string | null;
};

const MIN_FUZZY_SEARCH_CHARS = 2;

const ALLOWED_SPORTS = [
  "Calcio",
  "Calcio a 8",
  "Calcio a 7",
  "Futsal",
  "Volley",
  "Basket",
  "Pallanuoto",
  "Pallamano",
  "Rugby",
  "Hockey su prato",
  "Hockey su ghiaccio",
  "Baseball",
  "Softball",
  "Lacrosse",
  "Football americano",
] as const;

const ALLOWED_SPORTS_NORMALIZED = new Set(
  ALLOWED_SPORTS.map((sport) => sport.toLowerCase())
);

const SPORT_ALIASES: Record<string, string> = {
  pallavolo: "Volley",
  hockey: "Hockey su prato",
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

function normalizeSportName(value: string) {
  const normalized = clean(value).toLowerCase();
  return SPORT_ALIASES[normalized] ?? value;
}

function sportsToDisciplines(sportNormalizzati: string | null) {
  const unique = new Set<string>();
  return clean(sportNormalizzati)
    .split("|")
    .map((sport) => normalizeSportName(sport.trim()))
    .filter(Boolean)
    .filter((sport) => ALLOWED_SPORTS_NORMALIZED.has(sport.toLowerCase()))
    .filter((sport) => {
      const key = sport.toLowerCase();
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    })
    .map((sport) => ({
      clubandplayer_sport: sport,
      discipline_raw: sport,
    }));
}

export async function GET(req: NextRequest) {
  try {
    try {
      await rateLimit(req, { key: 'registry:clubs:search', limit: 60, window: '1m' });
    } catch (error: any) {
      return NextResponse.json(
        { ok: false, error: 'Too Many Requests', retryAfter: error?.headers?.['Retry-After'] ?? null },
        { status: 429 },
      );
    }

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
        is_claimed,
        claimed_profile_id
      `
      )
      .order("denominazione", { ascending: true })
      .limit(50);

    if (q.length >= MIN_FUZZY_SEARCH_CHARS) {
      query = query.ilike("denominazione", `%${q}%`);
    }

    if (region) {
      query = query.eq("regione", region);
    }

    if (province) {
      query = query.eq("provincia", province);
    }

    if (sport) {
      const normalizedSport = normalizeSportName(sport);
      if (!ALLOWED_SPORTS_NORMALIZED.has(normalizedSport.toLowerCase())) {
        return NextResponse.json({
          ok: true,
          count: 0,
          items: [],
        });
      }
      query = query.ilike("sport_normalizzati", `%${normalizedSport}%`);
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

    const items = rows
      .map((row) => {
      const masterId = row.master_id;
      const isClaimed = Boolean(row.is_claimed);
      const isPending = pendingMasterIds.has(masterId);
      const disciplines = sportsToDisciplines(row.sport_normalizzati);

      if (disciplines.length === 0) return null;

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
        claimed_by_profile_id: row.claimed_profile_id ?? null,
        registry_club_disciplines: disciplines,
      };
    })
      .filter(Boolean);

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
