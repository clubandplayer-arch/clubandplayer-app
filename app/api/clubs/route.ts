// app/api/clubs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized } from "@/lib/api/errors";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";         // Supabase SSR richiede Node
export const dynamic = "force-dynamic";  // niente cache su auth

export const GET = async (req: NextRequest) => {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return unauthorized("Not authenticated");

    // ...qui la tua logica (es. lista clubs per user)
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("owner_id", user.id)
      .limit(50);

    if (error) return badRequest(error.message);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return badRequest(e?.message ?? "Unexpected error");
  }
};
