// lib/data/clubs.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Club } from "@/types/club";
import { COUNTRY_CODES, CLUB_STATUS } from "@/lib/types/entities";

export type ClubFilters = {
  q?: string;
  country?: string;
  status?: string;
  city?: string;
  from?: string;
  to?: string;
};
export type Page = { page: number; limit: number };
export type ClubResult = { items: Club[]; total: number; hasMore: boolean };

const COUNTRY_SET = new Set(COUNTRY_CODES);
const STATUS_SET = new Set(CLUB_STATUS);

function normText(value?: string | null) {
  if (!value) return undefined;
  const t = value.trim();
  return t ? t : undefined;
}

function normCountry(value?: string | null) {
  if (!value) return undefined;
  const upper = value.trim().toUpperCase();
  if (COUNTRY_SET.has(upper as (typeof COUNTRY_CODES)[number])) return upper;
  return undefined;
}

function normStatus(value?: string | null) {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  if (STATUS_SET.has(lower as (typeof CLUB_STATUS)[number])) return lower;
  return undefined;
}

function normDateIso(value?: string | null) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function mapRow(row: Record<string, any>): Club {
  const country = normCountry(row.country) ?? (typeof row.country === "string" ? row.country : null);
  const status = normStatus(row.status) ?? (typeof row.status === "string" ? row.status : null);
  const createdAt = normDateIso(row.created_at ?? row.createdAt ?? null);

  const displayName = row.display_name ?? row.displayName ?? row.name ?? null;
  const logoUrl = row.logo_url ?? row.logoUrl ?? null;
  const ownerId = row.owner_id ?? row.ownerId ?? null;

  return {
    id: String(row.id),
    name: String(row.name ?? displayName ?? "Club"),
    display_name: displayName,
    displayName,
    city: normText(row.city) ?? null,
    country,
    status,
    level: (row.level ?? null) as Club["level"],
    logo_url: logoUrl,
    logoUrl,
    owner_id: ownerId,
    ownerId,
    created_at: createdAt,
    createdAt,
    updated_at: row.updated_at ?? row.updatedAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  } as Club;
}

/** ----- MOCK REPO ----- */
const MOCK_CITIES = ["Roma", "Milano", "Torino", "Madrid", "Paris", "Berlin", "London", "New York"];
const MOCK_NAMES = [
  "Atlético Carlentini",
  "Sporting Madrid",
  "Paris Étoile",
  "Berlin Adler",
  "London Lions",
  "New York Cosmos",
  "Torino Granata",
  "Milano Navigli",
];

const MOCK: Club[] = Array.from({ length: 60 }).map((_, i) => {
  const created = new Date();
  created.setDate(created.getDate() - i);
  const createdAt = created.toISOString();
  const name = `${MOCK_NAMES[i % MOCK_NAMES.length]} ${i + 1}`;
  const country = COUNTRY_CODES[i % COUNTRY_CODES.length];
  const status = CLUB_STATUS[i % CLUB_STATUS.length];

  return {
    id: String(i + 1),
    name,
    display_name: name,
    displayName: name,
    city: MOCK_CITIES[i % MOCK_CITIES.length],
    country,
    status,
    level: "amateur",
    logo_url: null,
    logoUrl: null,
    owner_id: null,
    ownerId: null,
    created_at: createdAt,
    createdAt,
    updated_at: createdAt,
    updatedAt: createdAt,
  } as Club;
});

export const ClubsRepo = {
  async search(filters: ClubFilters, page: Page): Promise<ClubResult> {
    try {
      return await this.searchDB(filters, page);
    } catch (err) {
      console.error("ClubsRepo.search fallback to mock", err);
      return searchMock(filters, page);
    }
  },

  async searchDB(filters: ClubFilters, { page, limit }: Page): Promise<ClubResult> {
    const supabase = await getSupabaseServerClient();

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    let query = supabase
      .from("clubs")
      .select(
        "id,name,display_name,city,country,status,level,logo_url,owner_id,created_at,updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    const q = normText(filters.q);
    if (q) {
      const like = `%${q}%`;
      query = query.or(`name.ilike.${like},display_name.ilike.${like},city.ilike.${like}`);
    }

    const country = normCountry(filters.country ?? null);
    if (country) query = query.eq("country", country);

    const status = normStatus(filters.status ?? null);
    if (status) query = query.eq("status", status);

    const city = normText(filters.city);
    if (city) query = query.ilike("city", `%${city}%`);

    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);

    const { data, count, error } = await query;
    if (error) throw error;

    const items = (data ?? []).map((row) => mapRow(row as Record<string, any>));
    const total = typeof count === "number" ? count : items.length;
    const hasMore = from + items.length < (count ?? items.length);

    return { items, total, hasMore };
  },
};

function searchMock(filters: ClubFilters, { page, limit }: Page): ClubResult {
  let items = MOCK.slice();

  const q = normText(filters.q)?.toLowerCase() ?? "";
  if (q) {
    items = items.filter((c) =>
      (c.display_name ?? c.name ?? "").toLowerCase().includes(q) || (c.city ?? "").toLowerCase().includes(q)
    );
  }

  const country = normCountry(filters.country ?? null);
  if (country) items = items.filter((c) => (c.country ?? "").toUpperCase() === country);

  const status = normStatus(filters.status ?? null);
  if (status) items = items.filter((c) => (c.status ?? "").toLowerCase() === status);

  const city = normText(filters.city)?.toLowerCase();
  if (city) items = items.filter((c) => (c.city ?? "").toLowerCase().includes(city));

  if (filters.from) items = items.filter((c) => (c.createdAt ?? c.created_at) >= filters.from!);
  if (filters.to) items = items.filter((c) => (c.createdAt ?? c.created_at) <= filters.to!);

  const total = items.length;
  const safeLimit = Math.max(1, limit);
  const start = (Math.max(1, page) - 1) * safeLimit;
  const end = start + safeLimit;
  const pageItems = items.slice(start, end);

  return { items: pageItems, total, hasMore: end < total };
}
