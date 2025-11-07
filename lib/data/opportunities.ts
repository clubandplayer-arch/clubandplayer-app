// lib/data/opportunities.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Opportunity, OpportunityRole, OpportunityStatus, CountryCode } from "@/lib/types/entities";

export type OppFilters = {
  q?: string;
  role?: string;
  country?: string;
  status?: string;
  city?: string;
  from?: string;
  to?: string;
};
export type Page = { page: number; limit: number };
export type OppResult = { items: Opportunity[]; total: number; hasMore: boolean };

const ROLE_SET: ReadonlySet<OpportunityRole> = new Set([
  "player",
  "coach",
  "staff",
  "scout",
  "director",
]);
const STATUS_SET: ReadonlySet<OpportunityStatus> = new Set([
  "open",
  "closed",
  "draft",
  "archived",
]);
const COUNTRY_SET: ReadonlySet<CountryCode> = new Set([
  "IT",
  "ES",
  "FR",
  "DE",
  "UK",
  "US",
]);

function normText(v?: string | null) {
  if (!v) return undefined;
  const out = v.trim();
  return out ? out : undefined;
}

function normRole(value?: string | null): Opportunity["role"] | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (ROLE_SET.has(normalized as OpportunityRole)) {
    return normalized as OpportunityRole;
  }
  return undefined;
}

function normStatus(value?: string | null): Opportunity["status"] | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (STATUS_SET.has(normalized as OpportunityStatus)) {
    return normalized as OpportunityStatus;
  }
  return undefined;
}

function normCountry(value?: string | null): Opportunity["country"] | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (COUNTRY_SET.has(normalized as CountryCode)) {
    return normalized as CountryCode;
  }
  return undefined;
}

function normDateIso(value?: string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function mapRow(row: Record<string, any>): Opportunity {
  return {
    id: String(row.id),
    title: String(row.title ?? "Opportunità"),
    role: normRole(row.role),
    country: normCountry(row.country),
    city: normText(row.city),
    status: normStatus(row.status),
    createdAt: normDateIso(row.created_at ?? row.createdAt ?? null),
  };
}

function searchMock(filters: OppFilters, { page, limit }: Page): OppResult {
  const roles = Array.from(ROLE_SET);
  const countries = Array.from(COUNTRY_SET);
  const cities = ["Roma", "Milano", "Torino", "Madrid", "Paris", "Berlin", "London", "New York"];
  const statuses = Array.from(STATUS_SET);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };
  const mock: Opportunity[] = Array.from({ length: 120 }).map((_, i) => ({
    id: String(i + 1),
    title: `Opportunity ${i + 1} — ${roles[i % roles.length]} @ ${cities[i % cities.length]}`,
    role: roles[i % roles.length],
    country: countries[i % countries.length],
    city: cities[i % cities.length],
    status: statuses[i % statuses.length],
    createdAt: addDays(startDate, i).toISOString().slice(0, 10),
  }));

  const q = (filters.q ?? "").toLowerCase();
  const wantedRole = normRole(filters.role);
  const wantedStatus = normStatus(filters.status);
  const wantedCountry = normCountry(filters.country);
  let items = mock;
  if (q) items = items.filter((o) => o.title.toLowerCase().includes(q) || (o.city ?? "").toLowerCase().includes(q));
  if (wantedRole) items = items.filter((o) => o.role === wantedRole);
  if (wantedCountry) items = items.filter((o) => o.country === wantedCountry);
  if (wantedStatus) items = items.filter((o) => o.status === wantedStatus);
  if (filters.city) items = items.filter((o) => (o.city ?? "").toLowerCase().includes(filters.city!.toLowerCase()));
  if (filters.from) items = items.filter((o) => o.createdAt >= filters.from!);
  if (filters.to) items = items.filter((o) => o.createdAt <= filters.to!);

  const total = items.length;
  const start = Math.max(0, (page - 1) * limit);
  const end = start + limit;
  const pageItems = items.slice(start, end);

  return { items: pageItems, total, hasMore: end < total };
}

export const OpportunitiesRepo = {
  async search(filters: OppFilters, page: Page): Promise<OppResult> {
    try {
      return await this.searchDB(filters, page);
    } catch (err) {
      console.error("OpportunitiesRepo.search fallback to mock", err);
      return searchMock(filters, page);
    }
  },

  async searchDB(filters: OppFilters, { page, limit }: Page): Promise<OppResult> {
    const supabase = await getSupabaseServerClient();

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    let query = supabase
      .from("opportunities")
      .select(
        "id,title,role,status,country,city,created_at,owner_id,created_by",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    const q = normText(filters.q);
    if (q) {
      const like = `%${q}%`;
      query = query.or(
        `title.ilike.${like},description.ilike.${like},city.ilike.${like},region.ilike.${like},province.ilike.${like},sport.ilike.${like},role.ilike.${like}`
      );
    }
    const country = normCountry(filters.country);
    if (country) query = query.eq("country", country);
    const city = normText(filters.city);
    if (city) query = query.ilike("city", `%${city}%`);
    const role = normText(filters.role);
    if (role) query = query.ilike("role", role);
    const status = normText(filters.status);
    if (status) query = query.eq("status", status);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);

    const { data, count, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((row) => mapRow(row as Record<string, any>));
    const total = typeof count === "number" ? count : rows.length;
    const hasMore = from + rows.length < (count ?? rows.length);

    return { items: rows, total, hasMore };
  },
};
