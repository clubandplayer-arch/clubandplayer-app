// app/api/views/route.ts
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized } from "@/lib/api/errors";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (_req: NextRequest) => {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return unauthorized("Not authenticated");

    const { data, error } = await supabase
      .from("saved_views")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) return badRequest(error.message);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return badRequest(e?.message ?? "Unexpected error");
  }
};
