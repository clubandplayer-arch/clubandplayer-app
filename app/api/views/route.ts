import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async () => {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { user, supabase } = result;

  const { data, error } = await supabase
    .from("saved_views")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data });
};
