import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

function clean(value: string | null) {
  return String(value || "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const q = clean(searchParams.get("q"));
    const regione = clean(searchParams.get("regione"));
    const provincia = clean(searchParams.get("provincia"));
    const sport = clean(searchParams.get("sport"));

    let query = supabase
      .from("registry_clubs_master")
      .select(`
        master_id,
        denominazione,
        regione,
        provincia,
        comune,
        sport_normalizzati,
        is_claimed
      `)
      .order("denominazione", {
        ascending: true,
      })
      .limit(50);

    if (q) {
      query = query.ilike(
        "denominazione",
        `%${q}%`
      );
    }

    if (regione) {
      query = query.eq(
        "regione",
        regione
      );
    }

    if (provincia) {
      query = query.eq(
        "provincia",
        provincia
      );
    }

    if (sport) {
      query = query.ilike(
        "sport_normalizzati",
        `%${sport}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "REGISTRY MASTER SEARCH ERROR",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error: "SEARCH_FAILED",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      count: data?.length || 0,
      results: data || [],
    });

  } catch (err) {
    console.error(
      "REGISTRY MASTER API ERROR",
      err
    );

    return NextResponse.json(
      {
        ok: false,
        error: "INTERNAL_ERROR",
      },
      {
        status: 500,
      }
    );
  }
}