export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/opportunities/filter?sport=calcio&category=male&page=1&limit=20
 * - sport: (opz) uno degli sport di squadra definiti
 * - category: (opz) male|female|mixed
 * - page: (opz) default 1
 * - limit: (opz) default 20
 * Ritorna: { items, count, page, limit }
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  const url = new URL(req.url);
  const sport = url.searchParams.get("sport");
  const category = url.searchParams.get("category"); // male | female | mixed
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = supabase
    .from("opportunities")
    .select("id,title,sport,required_category,location_city,club_id,created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (sport) {
    q = q.eq("sport", sport);
  }

  if (category) {
    // Mostra annunci aperti a tutti (required_category IS NULL)
    // + annunci MISTI
    // + annunci della categoria specificata
    const parts = ["required_category.is.null", "required_category.eq.mixed"];
    if (category === "male" || category === "female") {
      parts.push(`required_category.eq.${category}`);
    }
    q = q.or(parts.join(","));
  }

  const { data, error, count } = await q.range(from, to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data ?? [],
    count: count ?? 0,
    page,
    limit,
  });
}
