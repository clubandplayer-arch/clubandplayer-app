import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { validateOrganizationMembership, OrganizationMembershipError } from '@/lib/sports/organizationMembership.server';
import { isClubHonorSeasonAvailable } from '@/lib/clubs/honorSeasons';

const errorJson = (error: string, status: number) => NextResponse.json({ error }, { status });
const validPlacement = (value: unknown) => value === 1 || value === 2 || value === 3;

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  const id = new URL(req.url).pathname.split('/').at(-1);
  const { data: club } = await supabase.from('profiles').select('id').eq('user_id', user.id).eq('account_type', 'club').single();
  if (!club) return errorJson('club_only', 403);
  const { data: old } = await supabase.from('club_honors').select('*').eq('id', id).eq('club_profile_id', club.id).single();
  if (!old) return errorJson('not_found', 404);
  const body = await req.json();
  const next = { ...old, ...body };
  if (!isClubHonorSeasonAvailable(next.season) || !validPlacement(next.placement)) return errorJson('invalid_honor', 400);
  try {
    await validateOrganizationMembership(supabase, { organizationId: next.sports_organization_id, categoryId: next.sports_organization_category_id, sportId: next.sport_id, disciplineId: next.sport_discipline_id, variantId: next.sport_variant_id });
  } catch (error) {
    return errorJson(error instanceof OrganizationMembershipError ? error.code : 'invalid_honor', 400);
  }
  const { data, error } = await supabase.from('club_honors').update(body).eq('id', id).eq('club_profile_id', club.id).select('*').single();
  return error ? errorJson(error.message, 400) : NextResponse.json({ data });
});
