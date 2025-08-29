// app/api/opportunities/route.ts
import { NextRequest, NextResponse } from "next/server";

type Opportunity = {
  id: string;
  title: string;
  role?: "player" | "coach" | "staff" | "scout" | "director";
  country?: "IT" | "ES" | "FR" | "DE" | "UK" | "US";
  city?: string;
  status?: "open" | "closed" | "draft" | "archived";
  createdAt: string; // ISO date
};

// ---- Mock dataset (in-memory) ----
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 6);

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

const ROLES: Opportunity["role"][] = ["player", "coach", "staff", "scout", "director"];
const COUNTRIES: Opportunity["country"][] = ["IT", "ES", "FR", "DE", "UK", "US"];
const CITIES = ["Roma", "Milano", "Torino", "Madrid", "Paris", "Berlin", "London", "New York"];
const STATUSES: NonNullable<Opportunity["status"]>[] = ["open", "closed", "draft", "archived"];

const MOCK: Opportunity[] = Array.from({ length: 123 }).map((_, i) => {
  const role = ROLES[i % ROLES.length];
  const country = COUNTRIES[i % COUNTRIES.length];
  const city = CITIES[i % CITIES.length];
  const status = STATUSES[i % STATUSES.length];
  const createdAt = addDays(startDate, i).toISOString().slice(0, 10); // YYYY-MM-DD
  return {
    id: String(i + 1),
    title: `Opportunity ${i + 1} — ${role} @ ${city}`,
    role,
    country,
    city,
    status,
    createdAt,
  };
});

// ---- Helpers ----
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

function applyFilters(items: Opportunity[], sp: URLSearchParams) {
  const q = (sp.get("q") ?? "").toLowerCase();
  const role = sp.get("role") ?? "";
  const country = sp.get("country") ?? "";
  const status = sp.get("status") ?? "";
  const city = (sp.get("city") ?? "").toLowerCase();
  const from = sp.get("from"); // YYYY-MM-DD
  const to = sp.get("to");     // YYYY-MM-DD

  let out = items;

  if (q) {
    out = out.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        (o.city ?? "").toLowerCase().includes(q)
    );
  }
  if (role) out = out.filter((o) => (o.role ?? "") === role);
  if (country) out = out.filter((o) => (o.country ?? "") === country);
  if (status) out = out.filter((o) => (o.status ?? "") === status);
  if (city) out = out.filter((o) => (o.city ?? "").toLowerCase().includes(city));
  if (from || to) out = out.filter((o) => inDateRange(o.createdAt, from, to));

  return out;
}

// ---- Handler ----
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
