import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsonError, withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { normalizeToEN, PLAYING_CATEGORY_EN } from '@/lib/enums';
import { normalizeOpportunityGender, toOpportunityDbValue } from '@/lib/opps/gender';
import { normalizeSport } from '@/lib/opps/constants';

export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) throw new Error('Supabase env missing');
  return createClient(url, anon);
}

const SELECT =
  'id,title,description,owner_id,created_by,club_id,created_at,country,region,province,city,sport,role,category,required_category,age_min,age_max,club_name,gender';

type ClubInfo = {
  club_profile_id: string | null;
  club_display_name: string | null;
  club_city: string | null;
  club_province: string | null;
  club_region: string | null;
};

async function findClubById(supabase: ReturnType<typeof getSupabase>, id: string) {
  const { data, error } = await supabase
    .from('clubs_view')
    .select('id,display_name,city')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function findProfileByUserId(supabase: ReturnType<typeof getSupabase>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,full_name,user_id,profile_type,account_type')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function resolveClubInfo(
  supabase: ReturnType<typeof getSupabase>,
  row: Record<string, unknown>
): Promise<ClubInfo> {
  const oppClubId = typeof row.club_id === 'string' && row.club_id ? row.club_id : null;
  const userIdCandidate =
    (typeof row.created_by === 'string' && row.created_by) ||
    (typeof row.owner_id === 'string' && row.owner_id) ||
    null;

  let clubProfileId: string | null = oppClubId;
  let profileDisplayName: string | null = null;
  let profileFullName: string | null = null;

  if (!clubProfileId && userIdCandidate) {
    const profile = await findProfileByUserId(supabase, userIdCandidate);
    clubProfileId = (profile as any)?.id ?? null;
    profileDisplayName = (profile as any)?.display_name ?? null;
    profileFullName = (profile as any)?.full_name ?? null;
  }

  let clubView: Record<string, unknown> | null = null;
  if (clubProfileId) {
    clubView = (await findClubById(supabase, clubProfileId)) as Record<string, unknown> | null;
  }

  const clubDisplayName =
    (typeof clubView?.display_name === 'string' && clubView.display_name) ||
    profileDisplayName ||
    profileFullName ||
    (typeof row.club_name === 'string' && row.club_name) ||
    null;

  return {
    club_profile_id:
      (typeof clubView?.id === 'string' && clubView.id) ||
      clubProfileId ||
      null,
    club_display_name: clubDisplayName,
    club_city: (typeof clubView?.city === 'string' && clubView.city) || null,
    club_province: null,
    club_region: null,
  };
}

function extractId(req: NextRequest): string | null {
  const pathname = new URL(req.url).pathname;
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? null;
}

function norm(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s && s !== '[object Object]' ? s : null;
  }
  if (typeof v === 'object') {
    const any = v as Record<string, unknown>;
    const s =
      (typeof any.value === 'string' && any.value) ||
      (typeof any.label === 'string' && any.label) ||
      (typeof any.nome === 'string' && any.nome) ||
      (typeof any.name === 'string' && any.name) ||
      (typeof any.description === 'string' && any.description) ||
      '';
    const out = String(s).trim();
    return out ? out : null;
  }
  return String(v).trim() || null;
}

function resolveGender(value: unknown): string | null {
  const normalized = normalizeOpportunityGender(value);
  return normalized ? toOpportunityDbValue(normalized, 'canonical') : null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('opportunities')
      .select(SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) return jsonError(error.message, 500);
    if (!data) return jsonError('Not found', 404);

    const clubInfo = await resolveClubInfo(supabase, data as Record<string, unknown>);
    return NextResponse.json({ data: { ...data, ...clubInfo } });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:PATCH', limit: 30, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = extractId(req);
  if (!id) return jsonError('Missing id', 400);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = norm(body.title);
  if (Object.prototype.hasOwnProperty.call(body, 'title') && !title) {
    return jsonError('Title is required', 400);
  }

  const description = norm(body.description);
  const country = norm(body.country);
  const region = norm(body.region);
  const province = norm(body.province);
  const city = norm(body.city);
  const sport = normalizeSport(norm(body.sport)) ?? null;
  const roleHuman =
    norm((body as any).role) ??
    norm((body as any).roleLabel) ??
    norm((body as any).roleValue);
  const clubName = norm((body as any).club_name);
  const category = norm((body as any).category);

  const hasRequiredField =
    Object.prototype.hasOwnProperty.call(body, 'required_category') ||
    Object.prototype.hasOwnProperty.call(body, 'requiredCategory') ||
    Object.prototype.hasOwnProperty.call(body, 'playing_category') ||
    Object.prototype.hasOwnProperty.call(body, 'playingCategory');

  const requiredCandidate =
    norm((body as any).required_category) ??
    norm((body as any).requiredCategory) ??
    norm((body as any).playing_category) ??
    norm((body as any).playingCategory);

  const hasGenderField = Object.prototype.hasOwnProperty.call(body, 'gender');
  const genderDb = hasGenderField ? resolveGender((body as any).gender) : null;
  if (hasGenderField && !genderDb) return jsonError('invalid_gender', 400);

  const hasAgeMin = Object.prototype.hasOwnProperty.call(body, 'age_min');
  const hasAgeMax = Object.prototype.hasOwnProperty.call(body, 'age_max');
  const ageMin = hasAgeMin
    ? typeof (body as any).age_min === 'number'
      ? (body as any).age_min
      : null
    : undefined;
  const ageMax = hasAgeMax
    ? typeof (body as any).age_max === 'number'
      ? (body as any).age_max
      : null
    : undefined;

  const { data: opp, error: fetchError } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by, sport')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return jsonError(fetchError.message, 400);
  if (!opp) return jsonError('not_found', 404);

  const ownerId = (opp.owner_id as string | null) ?? (opp.created_by as string | null);
  if (ownerId && ownerId !== user.id) return jsonError('forbidden', 403);

  const update: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, 'title') && title) update.title = title;
  if (Object.prototype.hasOwnProperty.call(body, 'description')) update.description = description;
  if (Object.prototype.hasOwnProperty.call(body, 'country')) update.country = country;
  if (Object.prototype.hasOwnProperty.call(body, 'region')) update.region = region;
  if (Object.prototype.hasOwnProperty.call(body, 'province')) update.province = province;
  if (Object.prototype.hasOwnProperty.call(body, 'city')) update.city = city;
  if (Object.prototype.hasOwnProperty.call(body, 'sport')) update.sport = sport;
  if (
    Object.prototype.hasOwnProperty.call(body, 'role') ||
    Object.prototype.hasOwnProperty.call(body, 'roleLabel') ||
    Object.prototype.hasOwnProperty.call(body, 'roleValue')
  ) {
    update.role = roleHuman;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'club_name')) update.club_name = clubName;
  if (Object.prototype.hasOwnProperty.call(body, 'category')) update.category = category;
  if (hasGenderField) update.gender = genderDb;
  if (hasAgeMin) update.age_min = ageMin ?? null;
  if (hasAgeMax) update.age_max = ageMax ?? null;

  const nextSport =
    normalizeSport((update.sport as string | null | undefined) ?? null) ??
    normalizeSport((opp.sport as string | null | undefined) ?? null) ??
    null;

  if (nextSport === 'Calcio') {
    const candidate = requiredCandidate ?? roleHuman;
    if (candidate) {
      const en = normalizeToEN(candidate);
      if (!en) {
        return NextResponse.json(
          { error: 'invalid_required_category', allowed_en: PLAYING_CATEGORY_EN },
          { status: 400 }
        );
      }
      update.required_category = en;
    } else if (hasRequiredField) {
      update.required_category = null;
    }
  } else if (hasRequiredField) {
    update.required_category = requiredCandidate ?? null;
  }

  // Migrazione soft: se manca l’owner, impostalo ora
  if (ownerId == null) {
    update.owner_id = user.id;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ data: opp });
  }

  const { data, error } = await supabase
    .from('opportunities')
    .update(update)
    .eq('id', id)
    .select(SELECT)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});

export const DELETE = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:DELETE', limit: 30, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = extractId(req);
  if (!id) return jsonError('Missing id', 400);

  const { data: opp, error: fetchError } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return jsonError(fetchError.message, 400);
  if (!opp) return jsonError('not_found', 404);

  const ownerId = (opp.owner_id as string | null) ?? (opp.created_by as string | null);
  if (ownerId && ownerId !== user.id) return jsonError('forbidden', 403);

  const { error: deleteError } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)
    .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`);

  if (deleteError) return jsonError(deleteError.message, 400);
  return NextResponse.json({ success: true });
});
