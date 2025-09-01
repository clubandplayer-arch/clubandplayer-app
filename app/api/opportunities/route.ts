// app/api/opportunities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized } from "@/lib/api/errors";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (req: NextRequest) => {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return unauthorized("Not authenticated");

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const query = supabase
      .from("opportunities")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) return badRequest(error.message);

    return NextResponse.json({ ok: true, data, page, limit, count });
  } catch (e: any) {
    return badRequest(e?.message ?? "Unexpected error");
  }
};
