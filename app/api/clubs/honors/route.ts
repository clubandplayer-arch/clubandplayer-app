import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { validateOrganizationMembership, OrganizationMembershipError } from '@/lib/sports/organizationMembership.server';
import { isClubHonorSeasonAvailable } from '@/lib/clubs/honorSeasons';

const errorJson = (error: string, status: number) => NextResponse.json({ error }, { status });
const validPlacement = (value: unknown) => value === 1 || value === 2 || value === 3;
async function clubProfile(supabase: any, userId: string) {
  return (await supabase.from('profiles').select('id').eq('user_id', userId).eq('account_type', 'club').single()).data;
}
const select = '*,sports:sport_id(code,canonical_name),organization:sports_organization_id(code,canonical_name),category:sports_organization_category_id(canonical_name)';

export const GET = withAuth(async (_req, { supabase, user }) => {
  const club = await clubProfile(supabase, user.id);
  if (!club) return errorJson('club_only', 403);
  const { data, error } = await supabase.from('club_honors').select(select).eq('club_profile_id', club.id).eq('is_active', true).order('season', { ascending: false }).order('placement').order('created_at').order('id');
  return error ? errorJson(error.message, 400) : NextResponse.json({ data: data ?? [] });
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const club = await clubProfile(supabase, user.id);
  if (!club) return errorJson('club_only', 403);
  const body = await req.json();
  if (!isClubHonorSeasonAvailable(body.season) || !validPlacement(body.placement)) return errorJson('invalid_honor', 400);
  try {
    await validateOrganizationMembership(supabase, { organizationId: body.sports_organization_id, categoryId: body.sports_organization_category_id, sportId: body.sport_id, disciplineId: body.sport_discipline_id ?? null, variantId: body.sport_variant_id ?? null });
  } catch (error) {
    return errorJson(error instanceof OrganizationMembershipError ? error.code : 'invalid_honor', 400);
  }
  const { data, error } = await supabase.from('club_honors').insert({ ...body, club_profile_id: club.id }).select(select).single();
  return error ? errorJson(error.message, 400) : NextResponse.json({ data });
});
