import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { isAdSlotValue } from '@/lib/ads/slots';
import { normalizeExternalUrl } from '@/lib/utils/normalizeExternalUrl';

export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toNullableText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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
    .from('ad_creatives')
    .select('id,campaign_id,slot,title,body,image_url,target_url,is_active,created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/ads/creatives] load error', error);
    return jsonError('Errore nel caricamento creatives', 400);
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

  const slot = typeof body?.slot === 'string' ? body.slot.trim() : '';
  if (!isAdSlotValue(slot)) return jsonError('Slot non valido', 400);

  const targetUrl = normalizeExternalUrl(body?.target_url);
  if (!targetUrl) return jsonError('target_url obbligatorio o non valido', 400);

  const payload = {
    campaign_id: campaignId,
    slot,
    title: toNullableText(body?.title),
    body: toNullableText(body?.body),
    image_url: toNullableText(body?.image_url),
    target_url: targetUrl,
  };

  const { data, error } = await adminClient
    .from('ad_creatives')
    .insert(payload)
    .select('id,campaign_id,slot,title,body,image_url,target_url,is_active,created_at')
    .single();

  if (error) {
    console.error('[admin/ads/creatives] create error', error);
    return jsonError('Errore durante la creazione creative', 400);
  }

  return NextResponse.json({ data });
});
