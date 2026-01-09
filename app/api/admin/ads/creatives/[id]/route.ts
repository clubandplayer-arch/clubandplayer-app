import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
