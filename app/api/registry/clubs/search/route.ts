import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || "";
    const region = searchParams.get("region")?.trim() || "";
    const province = searchParams.get("province")?.trim() || "";
    const sport = searchParams.get("sport")?.trim() || "";

    let allowedClubIds: string[] | null = null;

    if (sport) {
      const { data: disciplineRows, error: disciplineError } = await supabase
        .from("registry_club_disciplines")
        .select("registry_club_id")
        .eq("clubandplayer_sport", sport)
        .limit(1000);

      if (disciplineError) {
        console.error(disciplineError);

        return NextResponse.json(
          {
            ok: false,
            error: disciplineError.message,
          },
          {
            status: 500,
          }
        );
      }

      allowedClubIds = Array.from(
        new Set(
          (disciplineRows || [])
            .map((row) => row.registry_club_id)
            .filter(Boolean)
        )
      );

      if (allowedClubIds.length === 0) {
        return NextResponse.json({
          ok: true,
          count: 0,
          items: [],
        });
      }
    }

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
        registry_club_disciplines (
          clubandplayer_sport,
          discipline_raw
        )
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

    if (allowedClubIds) {
      query = query.in("id", allowedClubIds);
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