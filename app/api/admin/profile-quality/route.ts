import { NextResponse, type NextRequest } from 'next/server';

import { isAdminUser } from '@/lib/api/admin';
import { getClubNameReviewReason, normalizeClubNameForDuplicateCheck } from '@/lib/profiles/clubNameReview';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const sessionClient = await getSupabaseServerClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user || !(await isAdminUser(sessionClient, user))) return null;
  return { user, admin: getSupabaseAdminClient() };
}

export async function GET() {
  const context = await requireAdmin();
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await context.admin
    .from('profiles')
    .select('id,user_id,full_name,display_name,sport,city,province,region,status,profile_visibility_status,registry_master_id,club_name_review_status,club_name_review_reason,updated_at')
    .or('account_type.eq.club,type.eq.club')
    .order('updated_at', { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profiles = data ?? [];
  const duplicateGroups = new Map<string, string[]>();
  for (const profile of profiles) {
    const key = normalizeClubNameForDuplicateCheck(profile.full_name || profile.display_name);
    if (!key) continue;
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), String(profile.id)]);
  }

  const registryIds = profiles.map((profile) => profile.registry_master_id).filter(Boolean) as string[];
  const { data: registryRows, error: registryError } = registryIds.length
    ? await context.admin
        .from('registry_clubs_master')
        .select('master_id,denominazione,claimed_profile_id,is_claimed')
        .in('master_id', registryIds)
    : { data: [], error: null };
  if (registryError) return NextResponse.json({ error: registryError.message }, { status: 500 });
  const registryById = new Map((registryRows ?? []).map((row) => [String(row.master_id), row]));

  const rows = profiles.flatMap((profile) => {
    const name = String(profile.full_name || profile.display_name || '').trim();
    const normalizedName = normalizeClubNameForDuplicateCheck(name);
    const duplicates = (duplicateGroups.get(normalizedName) ?? []).filter((id) => id !== String(profile.id));
    const registry = profile.registry_master_id ? registryById.get(String(profile.registry_master_id)) ?? null : null;
    const reasons = new Set<string>();
    const reviewReason = getClubNameReviewReason(name);
    if (reviewReason && profile.club_name_review_status !== 'approved') reasons.add(reviewReason);
    if (profile.club_name_review_status === 'pending' && profile.club_name_review_reason) reasons.add(profile.club_name_review_reason);
    if (duplicates.length) reasons.add(`Possibile duplicato di ${duplicates.length} profilo/i`);
    if (!profile.registry_master_id) reasons.add('Profilo non collegato al Registro Club');
    if (registry && (!registry.is_claimed || registry.claimed_profile_id !== profile.id)) reasons.add('Collegamento Registro incoerente');
    if (profile.club_name_review_status === 'rejected') reasons.add('Nome rifiutato in revisione');
    if (profile.profile_visibility_status === 'suspended') reasons.add('Profilo sospeso');
    if (!reasons.size) return [];

    return [{ ...profile, name, reasons: Array.from(reasons), duplicate_profile_ids: duplicates, registry }];
  });

  return NextResponse.json({
    data: rows,
    summary: {
      total_clubs: profiles.length,
      anomalies: rows.length,
      suspicious_names: rows.filter((row) => row.club_name_review_status === 'pending' || (row.club_name_review_status !== 'approved' && Boolean(getClubNameReviewReason(row.name)))).length,
      duplicate_groups: Array.from(duplicateGroups.values()).filter((ids) => ids.length > 1).length,
      unlinked_registry: profiles.filter((profile) => !profile.registry_master_id).length,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const context = await requireAdmin();
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({})) as { profile_id?: string; action?: string };
  const profileId = typeof body.profile_id === 'string' ? body.profile_id.trim() : '';
  const action = typeof body.action === 'string' ? body.action : '';
  if (!profileId || !['approve_name', 'reject_name', 'suspend', 'restore'].includes(action)) {
    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update = action === 'approve_name'
    ? { club_name_review_status: 'approved', club_name_review_reason: null, club_name_reviewed_at: now, club_name_reviewed_by: context.user.id }
    : action === 'reject_name'
      ? { club_name_review_status: 'rejected', club_name_reviewed_at: now, club_name_reviewed_by: context.user.id }
      : action === 'suspend'
        ? { profile_visibility_status: 'suspended' }
        : { profile_visibility_status: 'draft' };

  const { data, error } = await context.admin
    .from('profiles')
    .update({ ...update, updated_at: now })
    .eq('id', profileId)
    .or('account_type.eq.club,type.eq.club')
    .select('id,profile_visibility_status,club_name_review_status,club_name_review_reason')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Profilo Club non trovato' }, { status: 404 });
  return NextResponse.json({ data });
}
