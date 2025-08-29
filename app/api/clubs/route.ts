// app/api/clubs/route.ts
import { NextRequest, NextResponse } from "next/server";

type Club = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  role?: string;
  status?: string;
};

const MOCK: Club[] = Array.from({ length: 87 }).map((_, i) => ({
  id: String(i + 1),
  name: `Club ${i + 1}`,
  city: i % 3 === 0 ? "Roma" : i % 3 === 1 ? "Milano" : "Torino",
  country: i % 2 === 0 ? "IT" : "ES",
  role: i % 4 === 0 ? "coach" : i % 4 === 1 ? "player" : i % 4 === 2 ? "staff" : "scout",
  status: i % 5 === 0 ? "open" : i % 5 === 1 ? "closed" : i % 5 === 2 ? "draft" : "archived",
}));

function applyFilters(items: Club[], sp: URLSearchParams) {
  const q = sp.get("q")?.toLowerCase() ?? "";
  const role = sp.get("role") ?? "";
  const country = sp.get("country") ?? "";
  const status = sp.get("status") ?? "";
  const city = sp.get("city")?.toLowerCase() ?? "";

  let out = items.slice();

  if (q) out = out.filter((c) => c.name.toLowerCase().includes(q));
  if (role) out = out.filter((c) => (c.role ?? "") === role);
  if (country) out = out.filter((c) => (c.country ?? "") === country);
  if (status) out = out.filter((c) => (c.status ?? "") === status);
  if (city) out = out.filter((c) => (c.city ?? "").toLowerCase().includes(city));

  // from/to ignorati nello stub (pronti per estensione con date reali)
  return out;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "20", 10) || 20));

  const filtered = applyFilters(MOCK, sp);
  const total = filtered.length;

  const start = (page - 1) * limit;
  const end = start + limit;

  const items = filtered.slice(start, end);
  const hasMore = end < total;

  return NextResponse.json({ items, total, hasMore });
}
