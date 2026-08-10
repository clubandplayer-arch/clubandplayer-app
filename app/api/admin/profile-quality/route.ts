import { NextResponse, type NextRequest } from 'next/server';

import { isAdminUser } from '@/lib/api/admin';
import { getClubNameReviewReason, isMissingClubQualitySchemaError, normalizeClubNameForDuplicateCheck } from '@/lib/profiles/clubNameReview';
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

  const qualityResult = await context.admin
    .from('profiles')
    .select('id,user_id,full_name,display_name,sport,city,province,region,status,profile_visibility_status,registry_master_id,club_name_review_status,club_name_review_reason,club_name_reviewed_at,club_name_reviewed_by,updated_at')
    .or('account_type.eq.club,type.eq.club')
    .order('updated_at', { ascending: false })
    .limit(2000);
  let schemaReady = true;
  let data = qualityResult.data;
  if (qualityResult.error && isMissingClubQualitySchemaError(qualityResult.error)) {
    schemaReady = false;
    const fallbackResult = await context.admin
      .from('profiles')
      .select('id,user_id,full_name,display_name,sport,city,province,region,status,profile_visibility_status,updated_at')
      .or('account_type.eq.club,type.eq.club')
      .order('updated_at', { ascending: false })
      .limit(2000);
    if (fallbackResult.error) return NextResponse.json({ error: fallbackResult.error.message }, { status: 500 });
    data = (fallbackResult.data ?? []).map((profile) => ({
      ...profile,
      registry_master_id: null,
      club_name_review_status: 'not_required',
      club_name_review_reason: null,
      club_name_reviewed_at: null,
      club_name_reviewed_by: null,
    }));
  } else if (qualityResult.error) {
    return NextResponse.json({ error: qualityResult.error.message }, { status: 500 });
  }

  const profiles = data ?? [];
  const duplicateGroups = new Map<string, string[]>();
  for (const profile of profiles) {
    const key = normalizeClubNameForDuplicateCheck(profile.full_name || profile.display_name);
    if (!key) continue;
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), String(profile.id)]);
  }

  const registryIds = profiles.map((profile) => profile.registry_master_id).filter(Boolean) as string[];
  const profileIds = profiles.map((profile) => String(profile.id));
  const { data: registryRows, error: registryError } = schemaReady && registryIds.length
    ? await context.admin
        .from('registry_clubs_master')
        .select('master_id,denominazione,claimed_profile_id,is_claimed')
        .in('master_id', registryIds)
    : !schemaReady && profileIds.length
      ? await context.admin
          .from('registry_clubs_master')
          .select('master_id,denominazione,claimed_profile_id,is_claimed')
          .eq('is_claimed', true)
          .in('claimed_profile_id', profileIds)
      : { data: [], error: null };
  if (registryError) return NextResponse.json({ error: registryError.message }, { status: 500 });
  const registryById = new Map((registryRows ?? []).map((row) => [String(row.master_id), row]));
  const registryByProfileId = new Map((registryRows ?? []).filter((row) => row.claimed_profile_id).map((row) => [String(row.claimed_profile_id), row]));

  const rows = profiles.flatMap((profile) => {
    const name = String(profile.full_name || profile.display_name || '').trim();
    const normalizedName = normalizeClubNameForDuplicateCheck(name);
    const duplicates = (duplicateGroups.get(normalizedName) ?? []).filter((id) => id !== String(profile.id));
    const fallbackRegistry = registryByProfileId.get(String(profile.id)) ?? null;
    const registryMasterId = profile.registry_master_id || fallbackRegistry?.master_id || null;
    const registry = registryMasterId ? registryById.get(String(registryMasterId)) ?? fallbackRegistry : null;
    const reasons = new Set<string>();
    const reviewReason = getClubNameReviewReason(name);
    if (reviewReason && profile.club_name_review_status !== 'approved') reasons.add(reviewReason);
    if (profile.club_name_review_status === 'pending' && profile.club_name_review_reason) reasons.add(profile.club_name_review_reason);
    if (duplicates.length) reasons.add(`Possibile duplicato di ${duplicates.length} profilo/i`);
    if (!registryMasterId) reasons.add('Profilo non collegato al Registro Club');
    if (registry && (!registry.is_claimed || registry.claimed_profile_id !== profile.id)) reasons.add('Collegamento Registro incoerente');
    if (profile.club_name_review_status === 'rejected') reasons.add('Nome rifiutato in revisione');
    if (profile.profile_visibility_status === 'suspended') reasons.add('Profilo sospeso');
    if (!reasons.size) return [];

    return [{ ...profile, registry_master_id: registryMasterId, name, reasons: Array.from(reasons), duplicate_profile_ids: duplicates, registry }];
  });

  return NextResponse.json({
    data: rows,
    summary: {
      total_clubs: profiles.length,
      anomalies: rows.length,
      suspicious_names: rows.filter((row) => row.club_name_review_status === 'pending' || (row.club_name_review_status !== 'approved' && Boolean(getClubNameReviewReason(row.name)))).length,
      duplicate_groups: Array.from(duplicateGroups.values()).filter((ids) => ids.length > 1).length,
      unlinked_registry: rows.filter((profile) => !profile.registry_master_id).length,
    },
    schema_ready: schemaReady,
    setup_message: schemaReady ? null : 'Lo schema P2 è assente o incompleto: verifica tutte e cinque le colonne di moderazione, ricarica la cache PostgREST e poi aggiorna la pagina.',
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

  const schemaProbe = await context.admin
    .from('profiles')
    .select('registry_master_id,club_name_review_status,club_name_review_reason,club_name_reviewed_at,club_name_reviewed_by')
    .limit(1);
  if (schemaProbe.error && isMissingClubQualitySchemaError(schemaProbe.error)) {
    return NextResponse.json(
      { error: 'La migrazione P2 per qualità e moderazione non è ancora applicata al database.' },
      { status: 503 },
    );
  }
  if (schemaProbe.error) return NextResponse.json({ error: schemaProbe.error.message }, { status: 500 });

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
  if (error && isMissingClubQualitySchemaError(error)) {
    return NextResponse.json(
      { error: 'La migrazione P2 per qualità e moderazione non è ancora applicata al database.' },
      { status: 503 },
    );
  }
  if (error) {
    console.error('[admin/profile-quality] moderation update failed', {
      profileId,
      action,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      {
        error: error.message,
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
      },
      { status: 500 },
    );
  }
  if (!data) return NextResponse.json({ error: 'Profilo Club non trovato' }, { status: 404 });
  return NextResponse.json({ data });
}
