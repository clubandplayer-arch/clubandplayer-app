import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toNullableText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
};
const normalizeSport = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const aliases: Record<string, string> = {
    pallavolo: 'volley',
    volley: 'volley',
    football: 'calcio',
    soccer: 'calcio',
    'calcio a 5': 'futsal',
    calcetto: 'futsal',
    futsal: 'futsal',
  };
  return aliases[normalized] ?? normalized;
};
const normalizeOptional = (value: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized === 'all') return null;
  return normalized;
};

export const GET = withAuth(async (req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id') ?? '';
  if (!UUID_REGEX.test(campaignId)) return jsonError('campaign_id non valido', 400);

  const { data, error } = await adminClient
    .from('ad_targets')
    .select('id,campaign_id,country,region,province,city,sport,audience,device,created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/ads/targets] load error', error);
    return jsonError('Errore nel caricamento target', 400);
  }

  return NextResponse.json({ data: data ?? [] });
});

export const POST = withAuth(async (req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const body = await req.json().catch(() => ({}));
  const campaignId = typeof body?.campaign_id === 'string' ? body.campaign_id.trim() : '';
  if (!UUID_REGEX.test(campaignId)) return jsonError('campaign_id non valido', 400);

  const payload = {
    campaign_id: campaignId,
    country: toNullableText(body?.country),
    region: toNullableText(body?.region),
    province: toNullableText(body?.province),
    city: toNullableText(body?.city),
    sport: normalizeSport(body?.sport),
    audience: normalizeOptional(body?.audience),
    device: normalizeOptional(body?.device),
  };

  const { data, error } = await adminClient
    .from('ad_targets')
    .insert(payload)
    .select('id,campaign_id,country,region,province,city,sport,audience,device,created_at')
    .single();

  if (error) {
    console.error('[admin/ads/targets] create error', error);
    return jsonError('Errore durante la creazione target', 400);
  }

  return NextResponse.json({ data });
});
