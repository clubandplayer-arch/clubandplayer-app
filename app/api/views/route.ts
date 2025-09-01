import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { badRequest, unauthorized } from "@/lib/api/errors";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const GET = withApiHandler(async (req: NextRequest) => {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw unauthorized("Login richiesto");

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  if (!scope) throw badRequest("Missing scope");

  const { data, error } = await supabase
    .from("saved_views")
    .select("*")
    .eq("user_id", user.id)
    .eq("scope", scope)
    .order("created_at", { ascending: false });

  if (error) throw badRequest(error.message);

  return NextResponse.json({ items: data ?? [] });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw unauthorized("Login richiesto");

  const body = await req.json();
  if (!body.scope || !body.name || !body.filters) {
    throw badRequest("Missing fields");
  }

  const { data, error } = await supabase
    .from("saved_views")
    .insert([
      {
        user_id: user.id,
        scope: body.scope,
        name: body.name,
        filters: body.filters,
      },
    ])
    .select()
    .single();

  if (error) throw badRequest(error.message);

  return NextResponse.json(data, { status: 201 });
});

export const DELETE = withApiHandler(async (req: NextRequest) => {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw unauthorized("Login richiesto");

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) throw badRequest("Missing id");

  const { error } = await supabase.from("saved_views").delete().eq("id", id);
  if (error) throw badRequest(error.message);

  return NextResponse.json({ ok: true });
});
