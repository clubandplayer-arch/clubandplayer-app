import { getSupabaseServerClient } from '@/lib/supabase/server';
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

const SELECT_FIELDS =
  'id,title,description,owner_id,created_by,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,status,club_name';

function sanitizeLike(value: string) {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

function toIsoDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeRow(row: Record<string, any>): Opportunity {
  return {
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? null,
    owner_id: row.owner_id ?? row.created_by ?? null,
    created_at: toIsoDate(row.created_at) ?? null,
    country: row.country ?? null,
    region: row.region ?? null,
    province: row.province ?? null,
    city: row.city ?? null,
    sport: row.sport ?? null,
    role: row.role ?? null,
    required_category: row.required_category ?? null,
    age_min: row.age_min ?? null,
    age_max: row.age_max ?? null,
    status: row.status ?? null,
    club_name: row.club_name ?? row.clubName ?? null,
    clubName: row.clubName ?? row.club_name ?? null,
  } as Opportunity;
}

export const OpportunitiesRepo = {
  async search(filters: OppFilters, page: Page): Promise<OppResult> {
    try {
      return await this.searchDB(filters, page);
    } catch (error) {
      console.error('OpportunitiesRepo.search fallback to empty result', error);
      return { items: [], total: 0, hasMore: false };
    }
  },

  async searchDB(filters: OppFilters, page: Page): Promise<OppResult> {
    const supabase = await getSupabaseServerClient();

    const safePage = Number.isFinite(page.page) && page.page > 0 ? Math.floor(page.page) : 1;
    const safeLimit =
      Number.isFinite(page.limit) && page.limit > 0 ? Math.min(Math.floor(page.limit), 100) : 20;

    const offset = (safePage - 1) * safeLimit;
    const to = offset + safeLimit - 1;

    let query = supabase
      .from('opportunities')
      .select(SELECT_FIELDS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, to);

    const q = filters.q?.trim();
    if (q) {
      const like = sanitizeLike(q);
      query = query.or(`title.ilike.%${like}%,city.ilike.%${like}%`);
    }

    const role = filters.role?.trim();
    if (role) {
      query = query.eq('role', role);
    }

    const country = filters.country?.trim();
    if (country) {
      query = query.eq('country', country);
    }

    const status = filters.status?.trim();
    if (status) {
      query = query.eq('status', status);
    }

    const city = filters.city?.trim();
    if (city) {
      query = query.ilike('city', `%${sanitizeLike(city)}%`);
    }

    const from = filters.from?.trim();
    if (from) {
      query = query.gte('created_at', from);
    }

    const toDate = filters.to?.trim();
    if (toDate) {
      query = query.lte('created_at', toDate);
    }

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<Record<string, any>>;

    const ownerIds = Array.from(
      new Set(
        rows
          .map((r) => (r.owner_id as string | null) || (r.created_by as string | null))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    let nameMap: Record<string, string> = {};
    if (ownerIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, full_name')
        .in('id', ownerIds);

      nameMap = (profiles || []).reduce((acc, row) => {
        const label = row.display_name || row.full_name || null;
        if (label) {
          acc[row.id] = label;
          if (row.user_id) acc[row.user_id] = label;
        }
        return acc;
      }, {} as Record<string, string>);
    }

    const items = rows.map((row) => {
      const ownerId = (row.owner_id as string | null) ?? (row.created_by as string | null) ?? null;
      const clubName = row.club_name ?? (ownerId ? nameMap[ownerId] : null) ?? null;
      return normalizeRow({ ...row, owner_id: ownerId, created_by: ownerId, club_name: clubName, clubName });
    });
    const total = typeof count === 'number' ? count : items.length;
    const hasMore = total > offset + items.length;

    return { items, total, hasMore };
  },
};

export async function getLatestOpenOpportunitiesByClub(
  clubProfileId: string,
  limit = 3,
): Promise<Opportunity[]> {
  try {
    const supabase = await getSupabaseServerClient();
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 20) : 3;
    const fetchLimit = Math.min(Math.max(safeLimit * 2, safeLimit + 2), 60);

    const { data, error } = await supabase
      .from('opportunities')
      .select(
        'id,title,city,province,region,country,created_at,status,club_id,owner_id,created_by,club_name',
      )
      .or(`club_id.eq.${clubProfileId},owner_id.eq.${clubProfileId},created_by.eq.${clubProfileId}`)
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (error) {
      console.error('getLatestOpenOpportunitiesByClub error', error);
      return [];
    }

    const filtered = (data ?? []).filter((row) => {
      const statusRaw = (row as any).status as string | null | undefined;
      const status = statusRaw ? statusRaw.toLowerCase() : null;
      return status === null || status === 'open' || status === 'published';
    });

    const normalized = filtered
      .sort((a, b) => {
        const da = new Date((a as any).created_at ?? 0).getTime();
        const db = new Date((b as any).created_at ?? 0).getTime();
        return db - da;
      })
      .slice(0, safeLimit)
      .map((row) =>
        normalizeRow({
          ...row,
          owner_id: row.owner_id ?? row.created_by ?? row.club_id ?? null,
          club_name: row.club_name ?? null,
        }),
      );

    console.log('[getLatestOpenOpportunitiesByClub]', {
      clubProfileId,
      rows: normalized.map((r) => ({ id: r.id, title: r.title, status: r.status })),
    });

    return normalized;
  } catch (error) {
    console.error('getLatestOpenOpportunitiesByClub unexpected error', error);
    return [];
  }
}

export type { Opportunity };
