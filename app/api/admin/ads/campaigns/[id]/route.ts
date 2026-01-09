import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALUES = new Set(['draft', 'active', 'paused', 'archived']);

const toNullableText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toNullableDate = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const PATCH = withAuth(async (req, { supabase, user }, routeContext) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const params = (await routeContext?.params) as { id?: string } | undefined;
  const id = params?.id ?? '';
  if (!UUID_REGEX.test(id)) return jsonError('ID campagna non valido', 400);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    const name = toNullableText(body?.name);
    if (!name) return jsonError('Nome campagna non valido', 400);
    update.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    const rawStatus = typeof body?.status === 'string' ? body.status.trim().toLowerCase() : '';
    if (!rawStatus || !STATUS_VALUES.has(rawStatus)) return jsonError('Status non valido', 400);
    update.status = rawStatus;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'priority')) {
    if (!Number.isFinite(Number(body?.priority))) return jsonError('Priority non valida', 400);
    update.priority = Number(body.priority);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'start_at')) {
    const startAt = toNullableDate(body?.start_at);
    if (typeof startAt === 'undefined') return jsonError('start_at non valido', 400);
    update.start_at = startAt;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'end_at')) {
    const endAt = toNullableDate(body?.end_at);
    if (typeof endAt === 'undefined') return jsonError('end_at non valido', 400);
    update.end_at = endAt;
  }

  if (Object.keys(update).length === 0) return jsonError('Nessun campo da aggiornare', 400);

  const { data, error } = await adminClient
    .from('ad_campaigns')
    .update(update)
    .eq('id', id)
    .select('id,name,status,priority,start_at,end_at,created_at')
    .single();

  if (error) {
    console.error('[admin/ads/campaigns] update error', error);
    return jsonError('Errore durante aggiornamento campagna', 400);
  }

  return NextResponse.json({ data });
});
