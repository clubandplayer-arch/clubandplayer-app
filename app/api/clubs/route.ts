// app/api/clubs/route.ts
import { NextRequest, NextResponse } from "next/server";

type Club = {
  id: string;
  name: string;
  country?: "IT" | "ES" | "FR" | "DE" | "UK" | "US";
  city?: string;
  status?: "active" | "inactive" | "archived";
  createdAt: string; // YYYY-MM-DD
};

const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 9);

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

const COUNTRIES: NonNullable<Club["country"]>[] = ["IT", "ES", "FR", "DE", "UK", "US"];
const CITIES = ["Roma", "Milano", "Torino", "Madrid", "Paris", "Berlin", "London", "New York"];
const STATUSES: NonNullable<Club["status"]>[] = ["active", "inactive", "archived"];
const CLUB_NAMES = [
  "Atlético Carlentini","Sporting Madrid","Paris Étoile","Berlin Adler",
  "London Lions","New York Cosmos","Torino Granata","Milano Navigli",
];

const MOCK: Club[] = Array.from({ length: 87 }).map((_, i) => {
  const country = COUNTRIES[i % COUNTRIES.length];
  const city = CITIES[i % CITIES.length];
  const status = STATUSES[i % STATUSES.length];
  const createdAt = addDays(startDate, i).toISOString().slice(0, 10);
  const baseName = CLUB_NAMES[i % CLUB_NAMES.length];
  return { id: String(i + 1), name: `${baseName} ${i + 1}`, country, city, status, createdAt };
});

function parseIntSafe(v: string | null, def: number) {
  if (!v) return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function inDateRange(dateISO: string, from?: string | null, to?: string | null) {
  if (!from && !to) return true;
  const d = dateISO;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
function applyFilters(items: Club[], sp: URLSearchParams) {
  const q = (sp.get("q") ?? "").toLowerCase();
  const country = sp.get("country") ?? "";
  const status = sp.get("status") ?? "";
  const city = (sp.get("city") ?? "").toLowerCase();
  const from = sp.get("from");
  const to = sp.get("to");

  let out = items;
  if (q) out = out.filter(c => c.name.toLowerCase().includes(q) || (c.city ?? "").toLowerCase().includes(q));
  if (country) out = out.filter(c => (c.country ?? "") === country);
  if (status) out = out.filter(c => (c.status ?? "") === status);
  if (city) out = out.filter(c => (c.city ?? "").toLowerCase().includes(city));
  if (from || to) out = out.filter(c => inDateRange(c.createdAt, from, to));
  return out;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const page = parseIntSafe(sp.get("page"), 1);
  const limit = Math.min(100, parseIntSafe(sp.get("limit"), 20));

  const filtered = applyFilters(MOCK, sp);
  const total = filtered.length;

  const start = (page - 1) * limit;
  const end = start + limit;
  const items = filtered.slice(start, end);
  const hasMore = end < total;

  return NextResponse.json({ items, total, hasMore });
}
