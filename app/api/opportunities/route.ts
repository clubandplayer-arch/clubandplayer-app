import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (req: NextRequest) => {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { supabase } = result;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);
  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("opportunities")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data, page, limit, count });
};
