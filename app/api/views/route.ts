import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { badRequest } from "@/lib/api/errors";
import { createClient } from "@supabase/supabase-js";

// Supabase client con Service Role Key (solo lato server)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withApiHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  if (!scope) throw badRequest("Missing scope");

  // L’RLS farà in modo che vengano restituite solo le viste dell’utente corrente
  const { data, error } = await supabase
    .from("saved_views")
    .select("*")
    .eq("scope", scope)
    .order("created_at", { ascending: false });

  if (error) throw badRequest(error.message);

  return NextResponse.json({ items: data ?? [] });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  if (!body.scope || !body.name || !body.filters || !body.user_id) {
    throw badRequest("Missing fields");
  }

  const { data, error } = await supabase
    .from("saved_views")
    .insert([
      {
        scope: body.scope,
        name: body.name,
        filters: body.filters,
        user_id: body.user_id,
      },
    ])
    .select()
    .single();

  if (error) throw badRequest(error.message);

  return NextResponse.json(data, { status: 201 });
});

export const DELETE = withApiHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) throw badRequest("Missing id");

  const { error } = await supabase.from("saved_views").delete().eq("id", id);
  if (error) throw badRequest(error.message);

  return NextResponse.json({ ok: true });
});
