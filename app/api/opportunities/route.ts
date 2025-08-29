import { NextRequest, NextResponse } from "next/server";
import { OpportunitiesRepo } from "@/lib/data/opportunities";
import { parseFilters, parseLimit, parsePage } from "@/lib/search/params";
import { withApiHandler } from "@/lib/api/handler";
import { badRequest } from "@/lib/api/errors";

export const GET = withApiHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const page = parsePage(sp);
  const limit = Math.min(100, parseLimit(sp));
  if (limit <= 0) throw badRequest("limit must be > 0");

  const f = parseFilters(sp);
  const useDB = process.env.DATA_SOURCE === "db";
  const data = useDB
    ? await OpportunitiesRepo.searchDB(f, { page, limit })
    : await OpportunitiesRepo.search(f, { page, limit });

  return NextResponse.json(data);
});
