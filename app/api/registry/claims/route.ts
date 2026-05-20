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

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || "";
    const region = searchParams.get("region")?.trim() || "";
    const province = searchParams.get("province")?.trim() || "";
    const sport = searchParams.get("sport")?.trim() || "";

    const disciplineSelect = sport
      ? "registry_club_disciplines!inner ( clubandplayer_sport, discipline_raw )"
      : "registry_club_disciplines ( clubandplayer_sport, discipline_raw )";

    let query = supabase
      .from("registry_clubs")
      .select(`
        id,
        source,
        source_club_id,
        name,
        normalized_name,
        region,
        province,
        municipality,
        claim_status,
        ${disciplineSelect}
      `)
      .limit(50);

    if (q) {
      query = query.or(`name.ilike.%${q}%,normalized_name.ilike.%${q}%`);
    }

    if (region) {
      query = query.eq("region", region);
    }

    if (province) {
      query = query.eq("province", province);
    }

    if (sport) {
      query = query.eq(
        "registry_club_disciplines.clubandplayer_sport",
        sport
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);

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

    return NextResponse.json({
      ok: true,
      count: data?.length || 0,
      items: data || [],
    });
  } catch (err) {
    console.error(err);

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