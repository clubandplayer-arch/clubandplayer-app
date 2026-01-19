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

export const DELETE = withAuth(async (_req, { supabase, user }, routeContext) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const params = (await routeContext?.params) as { id?: string } | undefined;
  const id = params?.id ?? '';
  if (!UUID_REGEX.test(id)) return jsonError('ID creative non valido', 400);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const { error } = await adminClient.from('ad_creatives').delete().eq('id', id);
  if (error) {
    console.error('[admin/ads/creatives] delete error', error);
    return jsonError('Errore durante eliminazione creative', 400);
  }

  return NextResponse.json({ ok: true });
});

export const PATCH = withAuth(async (req, { supabase, user }, routeContext) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const params = (await routeContext?.params) as { id?: string } | undefined;
  const id = params?.id ?? '';
  if (!UUID_REGEX.test(id)) return jsonError('ID creative non valido', 400);

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if ('slot' in body) {
    const slot = typeof body?.slot === 'string' ? body.slot.trim() : '';
    if (!isAdSlotValue(slot)) return jsonError('Slot non valido', 400);
    updates.slot = slot;
  }

  if ('title' in body) updates.title = toNullableText(body?.title);
  if ('body' in body) updates.body = toNullableText(body?.body);
  if ('image_url' in body) updates.image_url = toNullableText(body?.image_url);

  if ('target_url' in body) {
    const targetUrl = normalizeExternalUrl(body?.target_url);
    if (!targetUrl) return jsonError('target_url obbligatorio o non valido', 400);
    updates.target_url = targetUrl;
  }

  if ('is_active' in body) {
    if (typeof body?.is_active !== 'boolean') return jsonError('is_active non valido', 400);
    updates.is_active = body.is_active;
  }

  if (Object.keys(updates).length === 0) return jsonError('Nessun campo da aggiornare', 400);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const { data, error } = await adminClient
    .from('ad_creatives')
    .update(updates)
    .eq('id', id)
    .select('id,campaign_id,slot,title,body,image_url,target_url,is_active,created_at')
    .single();

  if (error) {
    console.error('[admin/ads/creatives] update error', error);
    return jsonError('Errore durante aggiornamento creative', 400);
  }

  return NextResponse.json({ data });
});
