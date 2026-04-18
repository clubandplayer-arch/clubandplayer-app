import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { buildEndorsedSet, normalizeProfileSkills, normalizeSkillName } from '@/lib/profiles/skills';
import type { ProfileLinks, ProfileSkill } from '@/types/profile';

// TODO(db): aggiungere unique partial index su public.profiles(user_id) where user_id is not null.

export type PublicProfileSummary = {
  id: string;
  profile_id: string | null;
  user_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
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
  birth_date?: string | null;
  birth_year?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  foot?: string | null;
  interest_country?: string | null;
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;
  links?: ProfileLinks;
  skills?: ProfileSkill[] | null;
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
  'birth_date',
  'birth_year',
  'height_cm',
  'weight_kg',
  'foot',
  'interest_country',
  'interest_region',
  'interest_province',
  'interest_city',
  'links',
  'skills',
].join(',');

type GenericClient = SupabaseClient<any, any, any>;

type FetchOptions = {
  fallbackToAdmin?: boolean;
  viewerId?: string | null;
};

async function enrichSkills(
  map: Map<string, PublicProfileSummary>,
  client: GenericClient | null,
  viewerId?: string | null,
) {
  if (!client || !map.size) return;
  const ids = Array.from(map.values()).map((p) => p.id).filter(Boolean);
  if (!ids.length) return;

  const { data: endorsementRows, error: countsError } = await client
    .from('profile_skill_endorsements')
    .select('profile_id, skill_name')
    .in('profile_id', ids);

  if (countsError && process.env.NODE_ENV !== 'production') {
    console.warn('[profiles] endorsement counts failed', countsError);
  }

  const countsByProfile = new Map<string, Map<string, number>>();
  for (const row of endorsementRows ?? []) {
    const profileId = String((row as any).profile_id ?? '');
    const normalizedName = normalizeSkillName((row as any).skill_name);
    if (!profileId || !normalizedName) continue;

    const mapForProfile = countsByProfile.get(profileId) ?? new Map<string, number>();
    const key = normalizedName.toLowerCase();
    mapForProfile.set(key, (mapForProfile.get(key) ?? 0) + 1);
    countsByProfile.set(profileId, mapForProfile);
  }

  let endorsedByMeByProfile = new Map<string, Set<string>>();
  if (viewerId) {
    const { data: endorsedRows, error: endorsedError } = await client
      .from('profile_skill_endorsements')
      .select('profile_id, skill_name')
      .eq('endorser_profile_id', viewerId)
      .in('profile_id', ids);

    if (endorsedError && process.env.NODE_ENV !== 'production') {
      console.warn('[profiles] endorsedByMe query failed', endorsedError);
    }

    endorsedByMeByProfile = new Map<string, Set<string>>();
    for (const row of endorsedRows ?? []) {
      const profileId = String((row as any).profile_id ?? '');
      if (!profileId) continue;
      const current = endorsedByMeByProfile.get(profileId) ?? new Set<string>();
      const set = buildEndorsedSet([row]);
      set.forEach((skill) => current.add(skill));
      endorsedByMeByProfile.set(profileId, current);
    }
  }

  for (const profile of map.values()) {
    if (!Array.isArray(profile.skills)) continue;
    const counts = countsByProfile.get(profile.id) ?? new Map<string, number>();
    const endorsedSet = endorsedByMeByProfile.get(profile.id) ?? new Set<string>();
    profile.skills = profile.skills.map((skill) => ({
      ...skill,
      endorsementsCount: counts.get(skill.name.toLowerCase()) ?? 0,
      endorsedByMe: endorsedSet.has(skill.name.toLowerCase()),
    }));
  }
}

function normalizeRow(row: Record<string, any>): PublicProfileSummary | null {
  const profileId = row.id ? String(row.id) : null;
  const userId = row.user_id ? String(row.user_id) : null;
  if (!profileId && !userId) return null;
  if (profileId && !userId && process.env.NODE_ENV !== 'production') {
    console.warn('[profiles] inconsistent row: profile without user_id', { profileId });
  }

  const skills: ProfileSkill[] | null = Array.isArray(row.skills) ? normalizeProfileSkills(row.skills) : null;

  const first = typeof row.first_name === 'string' ? row.first_name.trim() : '';
  const last = typeof row.last_name === 'string' ? row.last_name.trim() : '';
  const joined = [first, last].filter(Boolean).join(' ').trim();
  const fullName = (typeof row.full_name === 'string' ? row.full_name.trim() : '') || joined || null;
  const displayName =
    (typeof row.display_name === 'string' ? row.display_name.trim() : '') ||
    fullName ||
    null;

  const birthYearRaw = row.birth_year;
  const birthYear =
    typeof birthYearRaw === 'number'
      ? birthYearRaw
      : typeof birthYearRaw === 'string' && birthYearRaw.trim() !== ''
        ? Number(birthYearRaw)
        : null;
  const heightRaw = row.height_cm;
  const heightCm =
    typeof heightRaw === 'number'
      ? heightRaw
      : typeof heightRaw === 'string' && heightRaw.trim() !== ''
        ? Number(heightRaw)
        : null;
  const weightRaw = row.weight_kg;
  const weightKg =
    typeof weightRaw === 'number'
      ? weightRaw
      : typeof weightRaw === 'string' && weightRaw.trim() !== ''
        ? Number(weightRaw)
        : null;

  return {
    // Conserviamo l'id del profilo come identificativo principale
    id: profileId ?? userId ?? '',
    profile_id: profileId,
    user_id: userId,
    first_name: first || null,
    last_name: last || null,
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
    birth_date: typeof row.birth_date === 'string' ? row.birth_date : null,
    birth_year: Number.isFinite(birthYear) ? birthYear : null,
    height_cm: Number.isFinite(heightCm) ? heightCm : null,
    weight_kg: Number.isFinite(weightKg) ? weightKg : null,
    foot: typeof row.foot === 'string' ? row.foot : null,
    interest_country: typeof row.interest_country === 'string' ? row.interest_country : null,
    interest_region: typeof row.interest_region === 'string' ? row.interest_region : null,
    interest_province: typeof row.interest_province === 'string' ? row.interest_province : null,
    interest_city: typeof row.interest_city === 'string' ? row.interest_city : null,
    links: row.links && typeof row.links === 'object' ? (row.links as ProfileLinks) : null,
    skills,
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

    const rows = Array.isArray(data) ? data : [];

    for (const raw of rows) {
      if (!raw || typeof raw !== 'object' || (raw as any).error) continue;

      const row = raw as Record<string, any>;
      const summary = normalizeRow(row);
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

async function fillFromPlayersView(
  target: Map<string, PublicProfileSummary>,
  missing: Set<string>,
  client: GenericClient | null,
  column: 'id' | 'user_id',
  ids: string[],
): Promise<void> {
  if (!client || !ids.length) return;

  try {
    const { data, error } = await client
      .from('players_view')
      .select('id,user_id,display_name,full_name,headline,bio,sport,role,country,region,province,city,avatar_url,links')
      .in(column, ids);

    if (error) throw error;

    for (const raw of data ?? []) {
      const row = raw as Record<string, any>;
      const profileId = row.id ? String(row.id) : null;
      const userId = row.user_id ? String(row.user_id) : null;
      if (!profileId && !userId) continue;

      const summary: PublicProfileSummary = {
        id: profileId ?? userId ?? '',
        profile_id: profileId,
        user_id: userId,
        first_name: null,
        last_name: null,
        display_name: typeof row.display_name === 'string' ? row.display_name : null,
        full_name: typeof row.full_name === 'string' ? row.full_name : null,
        headline: typeof row.headline === 'string' ? row.headline : null,
        bio: typeof row.bio === 'string' ? row.bio : null,
        sport: typeof row.sport === 'string' ? row.sport : null,
        role: typeof row.role === 'string' ? row.role : null,
        country: typeof row.country === 'string' ? row.country : null,
        region: typeof row.region === 'string' ? row.region : null,
        province: typeof row.province === 'string' ? row.province : null,
        city: typeof row.city === 'string' ? row.city : null,
        avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
        account_type: 'athlete',
        birth_date: null,
        birth_year: null,
        height_cm: null,
        weight_kg: null,
        foot: null,
        interest_country: null,
        interest_region: null,
        interest_province: null,
        interest_city: null,
        links: row.links && typeof row.links === 'object' ? (row.links as ProfileLinks) : null,
        skills: null,
      };

      const keys = new Set<string>();
      if (profileId) keys.add(profileId);
      if (userId) keys.add(userId);

      for (const key of keys) {
        if (!target.has(key)) target.set(key, summary);
        if (missing.has(key)) missing.delete(key);
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[profiles] players_view query ${column} failed`, err);
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

  const clients: Array<{ client: GenericClient | null; label: string }> = [];
  if (options.fallbackToAdmin) {
    clients.push({ client: getSupabaseAdminClientOrNull(), label: 'admin' });
  }
  clients.push({ client: supabase, label: 'supabase' });

  for (const { client } of clients) {
    if (!client || !missing.size) continue;

    await fillFromClient(result, missing, client, 'id', Array.from(missing));
    if (missing.size) {
      await fillFromClient(result, missing, client, 'user_id', Array.from(missing));
    }
    if (missing.size) {
      await fillFromPlayersView(result, missing, client, 'id', Array.from(missing));
    }
    if (missing.size) {
      await fillFromPlayersView(result, missing, client, 'user_id', Array.from(missing));
    }
    if (!missing.size) break;
  }

  await enrichSkills(result, supabase, options.viewerId);

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
