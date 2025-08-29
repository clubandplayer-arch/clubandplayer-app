// app/api/opportunities/route.ts
import { NextRequest, NextResponse } from "next/server";

type Opportunity = {
  id: string;
  title: string;
  club?: string;
  location?: string;
  postedAt?: string; // ISO
};

const TOTAL = 125; // numero fittizio per simulare più pagine

function makeItem(i: number): Opportunity {
  const day = (i % 28) + 1;
  return {
    id: `op_${i}`,
    title: `Opportunity #${i}`,
    club: `Club ${i % 7}`,
    location: ["Roma", "Milano", "Torino", "Bologna"][i % 4],
    postedAt: `2024-11-${String(day).padStart(2, "0")}T12:00:00.000Z`,
  };
}

export async function GET(req: NextRequest) {
  // es: /api/opportunities?page=1&limit=20
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);

  const start = (page - 1) * limit;
  const end = Math.min(start + limit, TOTAL);

  const items: Opportunity[] = [];
  for (let i = start; i < end; i++) items.push(makeItem(i + 1));

  const hasMore = end < TOTAL;

  return NextResponse.json({ items, total: TOTAL, hasMore });
}
