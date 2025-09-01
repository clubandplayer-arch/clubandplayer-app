import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listParamsSchema } from "../../../lib/api/schemas";
import { rateLimit } from "../../../lib/api/rateLimit";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";

export const runtime = "nodejs";

function allowPreviewBypass(req: NextRequest) {
  const isPreview =
    process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";
  const bypass = process.env.API_BYPASS_SERVICE_ROLE === "true";
  if (!isPreview || !bypass) return false;
  const headerKey = req.headers.get("x-dev-key");
  const expected = process.env.PREVIEW_DEV_KEY;
  return !!expected && headerKey === expected;
}

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req);

    const raw = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = listParamsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Parametri query non validi" }, { status: 400 });
    }
    const { page, pageSize, orderBy, orderDir } = parsed.data;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const sortCol = orderBy ?? "id";

    // Bypass preview/dev
    if (allowPreviewBypass(req)) {
      const admin = getSupabaseAdminClient();
      const { data, error, count } = await admin
        .from("clubs")
        .select("*", { count: "exact" })
        .order(sortCol, { ascending: orderDir === "asc" })
        .range(from, to);
      if (error) throw error;

      return NextResponse.json(
        {
          ok: true,
          bypass: true,
          data,
          meta: {
            page,
            pageSize,
            total: count ?? null,
            pageCount: count != null ? Math.ceil(count / pageSize) : null,
            orderBy: sortCol,
            orderDir,
          },
        },
        { status: 200 }
      );
    }

    // Flusso autenticato (RLS)
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 });
    }

    const { data, error, count } = await supabase
      .from("clubs")
      .select("*", { count: "exact" })
      .order(sortCol, { ascending: orderDir === "asc" })
      .range(from, to);
    if (error) throw error;

    return NextResponse.json(
      {
        ok: true,
        data,
        meta: {
          page,
          pageSize,
          total: count ?? null,
          pageCount: count != null ? Math.ceil(count / pageSize) : null,
          orderBy: sortCol,
          orderDir,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    if (e?.status === 429) {
      return new NextResponse(JSON.stringify({ ok: false, error: "Too Many Requests" }), {
        status: 429,
        headers: { "content-type": "application/json", ...(e.headers ?? {}) },
      });
    }
    return NextResponse.json({ ok: false, error: e?.message ?? "Errore server" }, { status: 500 });
  }
}
