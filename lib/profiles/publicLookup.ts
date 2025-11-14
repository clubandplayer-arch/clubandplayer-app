import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export type PublicProfileSummary = {
  id: string;
  profile_id: string | null;
  user_id: string | null;
  display_name: string | null;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  sport: string | null;
  role: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  avatar_url: string | null;
  account_type: string | null;
};

const SELECT_FIELDS = [
  'id',
  'user_id',
  'display_name',
  'full_name',
  'first_name',
  'last_name',
  'headline',
  'bio',
  'sport',
  'role',
  'country',
  'region',
  'province',
  'city',
  'avatar_url',
  'account_type',
].join(',');

type GenericClient = SupabaseClient<any, any, any>;

type FetchOptions = {
  fallbackToAdmin?: boolean;
};

function normalizeRow(row: Record<string, any>): PublicProfileSummary | null {
  const profileId = row.id ? String(row.id) : null;
  const userId = row.user_id ? String(row.user_id) : profileId;
  if (!profileId && !userId) return null;

  const first = typeof row.first_name === 'string' ? row.first_name.trim() : '';
  const last = typeof row.last_name === 'string' ? row.last_name.trim() : '';
  const joined = [first, last].filter(Boolean).join(' ').trim();
  const fullName = (typeof row.full_name === 'string' ? row.full_name.trim() : '') || joined || null;
  const displayName =
    (typeof row.display_name === 'string' ? row.display_name.trim() : '') ||
    fullName ||
    null;

  return {
    id: userId ?? profileId ?? '',
    profile_id: profileId,
    user_id: userId,
    display_name: displayName,
    full_name: fullName,
    headline: typeof row.headline === 'string' ? row.headline : null,
    bio: typeof row.bio === 'string' ? row.bio : null,
    sport: typeof row.sport === 'string' ? row.sport : null,
    role: typeof row.role === 'string' ? row.role : null,
    country: typeof row.country === 'string' ? row.country : null,
    region: typeof row.region === 'string' ? row.region : null,
    province: typeof row.province === 'string' ? row.province : null,
    city: typeof row.city === 'string' ? row.city : null,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    account_type: typeof row.account_type === 'string' ? row.account_type : null,
  };
}

async function fillFromClient(
  target: Map<string, PublicProfileSummary>,
  missing: Set<string>,
  client: GenericClient | null,
  column: 'id' | 'user_id',
  ids: string[],
): Promise<void> {
  if (!client || !ids.length) return;

  try {
    const { data, error } = await client
      .from('profiles')
      .select(SELECT_FIELDS)
      .in(column, ids);

    if (error) throw error;

    for (const row of data ?? []) {
      const summary = normalizeRow(row as Record<string, any>);
      if (!summary) continue;

      const keys = new Set<string>();
      if (row.user_id) keys.add(String(row.user_id));
      if (row.id) keys.add(String(row.id));

      for (const key of keys) {
        if (!target.has(key)) {
          target.set(key, summary);
        }
        if (missing.has(key)) {
          missing.delete(key);
        }
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[profiles] query ${column} failed`, err);
    }
  }
}

function sanitizeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const value = String(raw ?? '').trim();
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export async function getPublicProfilesMap(
  ids: string[],
  supabase: GenericClient,
  options: FetchOptions = {},
): Promise<Map<string, PublicProfileSummary>> {
  const cleanIds = sanitizeIds(ids);
  const result = new Map<string, PublicProfileSummary>();
  if (!cleanIds.length) return result;

  const missing = new Set(cleanIds);

  await fillFromClient(result, missing, supabase, 'id', cleanIds);
  if (missing.size) {
    await fillFromClient(result, missing, supabase, 'user_id', Array.from(missing));
  }

  if (missing.size && options.fallbackToAdmin) {
    const admin = getSupabaseAdminClientOrNull();
    if (admin) {
      const stillMissing = Array.from(missing);
      await fillFromClient(result, missing, admin, 'id', stillMissing);
      if (missing.size) {
        await fillFromClient(result, missing, admin, 'user_id', Array.from(missing));
      }
    }
  }

  return result;
}

export async function getPublicProfile(
  id: string,
  supabase: GenericClient,
  options: FetchOptions = {},
): Promise<PublicProfileSummary | null> {
  const map = await getPublicProfilesMap([id], supabase, options);
  if (map.has(id)) return map.get(id) ?? null;
  return map.size ? Array.from(map.values())[0] : null;
}
