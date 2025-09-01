import { NextRequest, NextResponse } from "next/server";
import { ClubsRepo } from "@/lib/data/clubs";
import { parseFilters, parseLimit, parsePage } from "@/lib/search/params";
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
  const sp = url.searchParams;

  const page = parsePage(sp);
  const limit = Math.min(100, parseLimit(sp));
  if (limit <= 0) throw badRequest("limit must be > 0");

  const f = parseFilters(sp);

  const useDB = process.env.DATA_SOURCE === "db";
  const data = useDB
    ? await ClubsRepo.searchDB(f, { page, limit })
    : await ClubsRepo.search(f, { page, limit });

  return NextResponse.json(data);
});
