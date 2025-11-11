// lib/data/opportunities.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/types/opportunity";
import {
  COUNTRY_CODES,
  OPPORTUNITY_ROLES,
  OPPORTUNITY_STATUS,
} from "@/lib/types/entities";
import type { OpportunityRole, OpportunityStatus, CountryCode } from "@/lib/types/entities";

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

const ROLE_SET: ReadonlySet<OpportunityRole> = new Set(OPPORTUNITY_ROLES);
const STATUS_SET: ReadonlySet<OpportunityStatus> = new Set(OPPORTUNITY_STATUS);
const COUNTRY_SET: ReadonlySet<CountryCode> = new Set(COUNTRY_CODES);

function normText(value?: string | null) {
  if (!value) return undefined;
  const out = value.trim();
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
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function mapRow(row: Record<string, any>): Opportunity {
  const role = normRole(row.role) ?? (typeof row.role === "string" ? row.role : null);
  const status = normStatus(row.status) ?? (typeof row.status === "string" ? row.status : null);
  const country = normCountry(row.country) ?? (typeof row.country === "string" ? row.country : null);
  const createdAt = normDateIso(row.created_at ?? row.createdAt ?? null);
  const updatedAt = row.updated_at ?? row.updatedAt ?? null;
  const ownerId = row.owner_id ?? row.created_by ?? row.ownerId ?? null;

  return {
    id: String(row.id),
    title: String(row.title ?? "Opportunità"),
    description: row.description ?? null,
    country,
    region: row.region ?? null,
    province: row.province ?? null,
    city: normText(row.city) ?? null,
    sport: row.sport ?? null,
    role,
    status,
    gender: row.gender ?? null,
    age_min: toNumber(row.age_min),
    age_max: toNumber(row.age_max),
    age_bracket: row.age_bracket ?? null,
    club_name: row.club_name ?? null,
    owner_id: ownerId,
    ownerId,
    created_by: row.created_by ?? ownerId,
    created_at: createdAt,
    createdAt,
    updated_at: updatedAt,
    updatedAt,
  } as Opportunity;
}

function buildMock(): Opportunity[] {
  const roles = Array.from(ROLE_SET);
  const countries = Array.from(COUNTRY_SET);
  const statuses = Array.from(STATUS_SET);
  const cities = ["Roma", "Milano", "Torino", "Madrid", "Paris", "Berlin", "London", "New York"];
  const sports = ["calcio", "basket", "volley", "rugby", "football", "futsal"];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  return Array.from({ length: 120 }).map((_, i) => {
    const created = new Date(startDate);
    created.setDate(created.getDate() + i);
    const role = roles[i % roles.length];
    const country = countries[i % countries.length];
    const status = statuses[i % statuses.length];
    const city = cities[i % cities.length];
    const sport = sports[i % sports.length];

    const createdAt = created.toISOString();
    return {
      id: String(i + 1),
      title: `Opportunity ${i + 1} — ${role} @ ${city}`,
      description: `Descrizione simulata per ${role} a ${city}.`,
      country,
      city,
      sport,
      role,
      status,
      gender: i % 2 === 0 ? "male" : "female",
      age_min: 18,
      age_max: 32,
      age_bracket: "U23",
      club_name: `Club ${i % 10}`,
      owner_id: null,
      ownerId: null,
      created_by: null,
      created_at: createdAt,
      createdAt,
      updated_at: createdAt,
      updatedAt: createdAt,
    } as Opportunity;
  });
}

const MOCK = buildMock();

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
        [
          "id",
          "title",
          "description",
          "role",
          "status",
          "sport",
          "country",
          "region",
          "province",
          "city",
          "gender",
          "age_min",
          "age_max",
          "age_bracket",
          "club_name",
          "owner_id",
          "created_by",
          "created_at",
          "updated_at",
        ].join(","),
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    const q = normText(filters.q);
    if (q) {
      const like = `%${q}%`;
      query = query.or(
        [
          `title.ilike.${like}`,
          `description.ilike.${like}`,
          `city.ilike.${like}`,
          `region.ilike.${like}`,
          `province.ilike.${like}`,
          `sport.ilike.${like}`,
          `role.ilike.${like}`,
          `club_name.ilike.${like}`,
        ].join(",")
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

function searchMock(filters: OppFilters, { page, limit }: Page): OppResult {
  const q = (filters.q ?? "").toLowerCase();
  const wantedRole = normRole(filters.role);
  const wantedStatus = normStatus(filters.status);
  const wantedCountry = normCountry(filters.country);
  let items = MOCK.slice();

  if (q) {
    items = items.filter((o) => {
      const haystacks = [
        o.title,
        o.description ?? "",
        o.city ?? "",
        o.sport ?? "",
        o.club_name ?? "",
      ].map((s) => (s ?? "").toLowerCase());
      return haystacks.some((s) => s.includes(q));
    });
  }

  if (wantedRole) items = items.filter((o) => (o.role ?? "").toString() === wantedRole);
  if (wantedCountry) items = items.filter((o) => (o.country ?? "") === wantedCountry);
  if (wantedStatus) items = items.filter((o) => (o.status ?? "") === wantedStatus);

  if (filters.city) {
    const city = filters.city.toLowerCase();
    items = items.filter((o) => (o.city ?? "").toLowerCase().includes(city));
  }
  if (filters.from) items = items.filter((o) => (o.createdAt ?? o.created_at) >= filters.from!);
  if (filters.to) items = items.filter((o) => (o.createdAt ?? o.created_at) <= filters.to!);

  const total = items.length;
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;
  const pageItems = items.slice(start, end);

  return { items: pageItems, total, hasMore: end < total };
}
