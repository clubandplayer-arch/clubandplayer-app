// app/api/clubs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listParamsSchema } from "@/lib/api/schemas";
import { rateLimit } from "@/lib/api/rateLimit";
import { badRequest, unauthorized } from "@/lib/api/errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // 1) Rate limit
    await rateLimit(req);

    // 2) Validazione query
    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = listParamsSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest("Parametri query non validi");
    }
    const { page, pageSize, orderBy, orderDir } = parsed.data;

    // 3) Auth & Supabase
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized("Non autenticato");

    // 4) Query (RLS applicata lato DB)
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const sortCol = orderBy ?? "created_at"; // se non esiste nella tabella, cambia in "id"

    const { data, error } = await supabase
      .from("clubs")
      .select("*", { count: "exact" })
      .order(sortCol, { ascending: orderDir === "asc" })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    if (e?.status === 429) {
      return new NextResponse(
        JSON.stringify({ ok: false, error: "Too Many Requests" }),
        { status: 429, headers: { "content-type": "application/json", ...(e.headers ?? {}) } }
      );
    }
    return NextResponse.json({ ok: false, error: e?.message ?? "Errore server" }, { status: 500 });
  }
}
