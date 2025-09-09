export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAnonClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}

/**
 * GET /api/opportunities/filter?sport=calcio&category=male&page=1&limit=20
 * Nota: per evitare errori di colonne mancanti, selezioniamo '*' e basta.
 * In questa fase va bene ricevere l'intero record; filtreremo lato UI in PR #5.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getAnonClient();

    const url = new URL(req.url);
    const sport = url.searchParams.get("sport");
    const category = url.searchParams.get("category"); // male|female|mixed
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = supabase
      .from("opportunities")
      .select("*", { count: "exact" }) // <-- niente colonne specifiche
      .order("created_at", { ascending: false });

    if (sport) q = q.eq("sport", sport);

    if (category) {
      const parts = ["required_category.is.null", "required_category.eq.mixed"];
      if (category === "male" || category === "female") {
        parts.push(`required_category.eq.${category}`);
      }
      q = q.or(parts.join(","));
    }

    const { data, error, count } = await q.range(from, to);
    if (error) throw error;

    return NextResponse.json({
      items: data ?? [],
      count: count ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("[/api/opportunities/filter] error:", err?.message || err);
    return NextResponse.json(
      { error: "internal_error", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
