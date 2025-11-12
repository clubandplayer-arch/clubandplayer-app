// lib/data/opportunities.ts
import type { Opportunity } from '@/types/opportunity';

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

function inDateRange(d: string, from?: string, to?: string) {
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/** ----- MOCK REPO (attuale) ----- */
const ROLES: NonNullable<Opportunity['role']>[] = ['player', 'coach', 'staff', 'scout', 'director'] as any;
const COUNTRIES: NonNullable<Opportunity['country']>[] = ['IT', 'ES', 'FR', 'DE', 'UK', 'US'] as any;
const CITIES = ['Roma', 'Milano', 'Torino', 'Madrid', 'Paris', 'Berlin', 'London', 'New York'];
const STATUSES: NonNullable<Opportunity['status']>[] = ['open', 'closed', 'draft', 'archived'] as any;

const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 6);
const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const MOCK: Opportunity[] = Array.from({ length: 123 }).map((_, i) => {
  const o = {
    id: String(i + 1),
    title: `Opportunity ${i + 1} — ${ROLES[i % ROLES.length]} @ ${CITIES[i % CITIES.length]}`,
    role: ROLES[i % ROLES.length],
    country: COUNTRIES[i % COUNTRIES.length],
    city: CITIES[i % CITIES.length],
    status: STATUSES[i % STATUSES.length],
    createdAt: addDays(startDate, i).toISOString().slice(0, 10),
  } as Opportunity;
  return o;
});

export const OpportunitiesRepo = {
  /** MOCK implementation (default) */
  async search(filters: OppFilters, { page, limit }: Page): Promise<OppResult> {
    const q = (filters.q ?? '').toLowerCase();

    let arr = MOCK.slice();

    if (q) {
      arr = arr.filter(
        (o) => o.title.toLowerCase().includes(q) || (o.city ?? '').toLowerCase().includes(q)
      );
    }
    if (filters.role) arr = arr.filter((o) => (o.role ?? '') === filters.role);
    if (filters.country) arr = arr.filter((o) => (o.country ?? '') === filters.country);
    if (filters.status) arr = arr.filter((o) => (o.status ?? '') === filters.status);
    if (filters.city)
      arr = arr.filter((o) => (o.city ?? '').toLowerCase().includes(filters.city!.toLowerCase()));
    if (filters.from || filters.to)
      arr = arr.filter((o) => inDateRange((o.createdAt ?? '') as string, filters.from, filters.to));

    const total = arr.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = arr.slice(start, end);
    return { items, total, hasMore: end < total };
  },

  /** DB implementation (stub): sostituisci con la tua query reale */
  async searchDB(filters: OppFilters, { page, limit }: Page): Promise<OppResult> {
    // TODO: rimpiazza con ORM/SQL; assicurati di restituire la stessa shape
    return this.search(filters, { page, limit }); // fallback MOCK
  },
};

export type { Opportunity };
