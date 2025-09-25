// lib/data/clubs.ts
import type { Club } from '@/lib/types/entities';

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

function inDateRange(d: string, from?: string, to?: string) {
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/** ----- MOCK REPO ----- */
const COUNTRIES: NonNullable<Club['country']>[] = ['IT', 'ES', 'FR', 'DE', 'UK', 'US'];
const CITIES = ['Roma', 'Milano', 'Torino', 'Madrid', 'Paris', 'Berlin', 'London', 'New York'];
const STATUSES: NonNullable<Club['status']>[] = ['active', 'inactive', 'archived'];
const CLUB_NAMES = [
  'Atlético Carlentini',
  'Sporting Madrid',
  'Paris Étoile',
  'Berlin Adler',
  'London Lions',
  'New York Cosmos',
  'Torino Granata',
  'Milano Navigli',
];
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 9);
const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const MOCK: Club[] = Array.from({ length: 87 }).map((_, i) => ({
  id: String(i + 1),
  name: `${CLUB_NAMES[i % CLUB_NAMES.length]} ${i + 1}`,
  country: COUNTRIES[i % COUNTRIES.length],
  city: CITIES[i % CITIES.length],
  status: STATUSES[i % STATUSES.length],
  createdAt: addDays(startDate, i).toISOString().slice(0, 10),
}));

export const ClubsRepo = {
  async search(filters: ClubFilters, { page, limit }: Page): Promise<ClubResult> {
    const q = (filters.q ?? '').toLowerCase();
    let arr = MOCK.slice();
    if (q)
      arr = arr.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.city ?? '').toLowerCase().includes(q),
      );
    if (filters.country) arr = arr.filter((c) => (c.country ?? '') === filters.country);
    if (filters.status) arr = arr.filter((c) => (c.status ?? '') === filters.status);
    if (filters.city)
      arr = arr.filter((c) => (c.city ?? '').toLowerCase().includes(filters.city!.toLowerCase()));
    if (filters.from || filters.to)
      arr = arr.filter((c) => inDateRange(c.createdAt, filters.from, filters.to));

    const total = arr.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = arr.slice(start, end);
    return { items, total, hasMore: end < total };
  },

  async searchDB(filters: ClubFilters, { page, limit }: Page): Promise<ClubResult> {
    // TODO: rimpiazza con ORM/SQL; assicurati di restituire la stessa shape
    return this.search(filters, { page, limit }); // fallback MOCK
  },
};
