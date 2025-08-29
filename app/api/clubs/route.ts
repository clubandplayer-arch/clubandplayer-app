import { NextRequest, NextResponse } from "next/server";
import { ClubsRepo } from "@/lib/data/clubs";
import { parseFilters, parseLimit, parsePage } from "@/lib/search/params";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const page = parsePage(sp);
  const limit = Math.min(100, parseLimit(sp));
  const f = parseFilters(sp);

  const useDB = process.env.DATA_SOURCE === "db";
  const data = useDB
    ? await ClubsRepo.searchDB(f, { page, limit })
    : await ClubsRepo.search(f, { page, limit });

  return NextResponse.json(data);
}
