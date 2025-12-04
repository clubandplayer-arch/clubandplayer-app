import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Opportunity } from '@/types/opportunity';

const SELECT_FIELDS =
  'id,title,description,owner_id,created_by,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name,club_id,status';

function clampLimit(n?: number, fallback = 5) {
  const safe = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  return Math.min(Math.max(Math.floor(safe), 1), 25);
}

function normalizeRow(row: Record<string, any>, nameMap: Record<string, string>): Opportunity {
  const ownerId = row.owner_id ?? row.created_by ?? row.club_id ?? null;
  const clubName = row.club_name ?? (ownerId ? nameMap[ownerId] : null) ?? null;

  return {
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? null,
    owner_id: ownerId,
    created_by: ownerId,
    club_id: row.club_id ?? ownerId ?? null,
    created_at: row.created_at ?? null,
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
    club_name: clubName,
    clubName,
  } as Opportunity;
}

export async function getRecommendedOpportunitiesForProfile(
  profileId: string,
  options?: { limit?: number; supabase?: SupabaseClient<any> },
): Promise<Opportunity[]> {
  const supabase = options?.supabase ?? (await getSupabaseServerClient());
  const limit = clampLimit(options?.limit, 5);
  const fetchLimit = Math.min(limit * 3, 50);

  const { data: profileById } = await supabase
    .from('profiles')
    .select('id,user_id,account_type,type,sport,country,region,province,city,interest_country,interest_region,interest_province,interest_city')
    .eq('id', profileId)
    .maybeSingle();

  const profile = profileById;

  if (!profile) {
    return [];
  }

  const sport = profile.sport ?? null;
  const province = profile.interest_province ?? profile.province ?? null;
  const region = profile.interest_region ?? profile.region ?? null;
  const country = profile.interest_country ?? profile.country ?? null;

  let query = supabase
    .from('opportunities')
    .select(SELECT_FIELDS)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (sport) query = query.eq('sport', sport);
  if (province) query = query.eq('province', province);
  else if (region) query = query.eq('region', region);
  else if (country) query = query.eq('country', country);

  query = query.not('status', 'in', '(closed,draft,archived,cancelled,canceled)');

  const { data, error } = await query;
  if (error) {
    console.error('[opps:recommendations] query error', error);
    return [];
  }

  const rows = (data ?? []) as Array<Record<string, any>>;
  const ownerIds = Array.from(
    new Set(
      rows
        .flatMap((r) => [r.created_by, r.owner_id, r.club_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let nameMap: Record<string, string> = {};
  if (ownerIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,user_id,display_name,full_name')
      .in('id', ownerIds);

    nameMap = (profiles || []).reduce((acc, row) => {
      const name = row.display_name || row.full_name || null;
      if (name) {
        acc[row.id] = name;
        if (row.user_id) acc[row.user_id] = name;
      }
      return acc;
    }, {} as Record<string, string>);
  }

  return rows
    .map((row) => normalizeRow(row, nameMap))
    .slice(0, limit);
}
