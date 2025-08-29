// lib/search/params.ts
import { NormalizedFilters, SearchFilters } from "@/lib/types/entities";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Chiavi dei filtri supportate e il loro ordine (stabile per SavedViews/link)
export const FILTER_KEYS: (keyof SearchFilters)[] = [
  "q", "role", "country", "status", "city", "from", "to",
];

type SPInput =
  | URLSearchParams
  | Readonly<URLSearchParams>
  | Record<string, string | string[] | undefined>;

/** Utility */
const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const clampInt = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Estrae un valore singolo dai params (accetta array e record) */
function getOne(sp: SPInput, key: string): string | undefined {
  if (sp instanceof URLSearchParams) return sp.get(key) ?? undefined;
  const raw = (sp as any)?.[key];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

/** Page/Limit */
export function parsePage(sp: SPInput): number {
  const raw = getOne(sp, "page");
  const n = raw ? parseInt(raw, 10) : DEFAULT_PAGE;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PAGE;
}
export function parseLimit(sp: SPInput): number {
  const raw = getOne(sp, "limit");
  const n = raw ? parseInt(raw, 10) : DEFAULT_LIMIT;
  return clampInt(Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT, 1, MAX_LIMIT);
}

/** Normalizza i filtri (stringhe vuote -> undefined, trimming) */
export function parseFilters(sp: SPInput): NormalizedFilters {
  const out = {} as NormalizedFilters;
  for (const k of FILTER_KEYS) {
    const v = getOne(sp, k);
    out[k] = isNonEmpty(v) ? v!.trim() : undefined;
  }
  return out;
}

/** Costruisce una query string consistente (solo chiavi valorizzate) */
export function buildQuery(filters: SearchFilters, page?: number, limit?: number): string {
  const p = new URLSearchParams();
  const _page = page ?? DEFAULT_PAGE;
  const _limit = limit ?? DEFAULT_LIMIT;
  p.set("page", String(_page));
  p.set("limit", String(clampInt(_limit, 1, MAX_LIMIT)));
  for (const k of FILTER_KEYS) {
    const v = filters[k];
    if (isNonEmpty(v)) p.set(k, v as string);
  }
  return p.toString();
}

/** Unisci lo stato attuale con override e ritorna la query string */
export function mergeQuery(
  current: SPInput,
  overrides: Partial<SearchFilters & { page?: number; limit?: number }>
): string {
  const filters = parseFilters(current);
  const page = overrides.page ?? parsePage(current);
  const limit = overrides.limit ?? parseLimit(current);

  // Applica override dei filtri
  const merged: SearchFilters = {};
  for (const k of FILTER_KEYS) {
    const ov = overrides[k as keyof SearchFilters];
    merged[k as keyof SearchFilters] = isNonEmpty(ov) ? (ov as string) : (filters[k] ?? undefined);
  }
  // Se cambio un filtro, riporto pagina a 1 (comportamento comune)
  const changedAnyFilter = FILTER_KEYS.some((k) => overrides[k as keyof SearchFilters] !== undefined);
  const nextPage = changedAnyFilter ? DEFAULT_PAGE : page;

  return buildQuery(merged, nextPage, limit);
}
