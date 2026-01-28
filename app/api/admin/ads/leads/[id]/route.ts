import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';

export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALUES = new Set(['new', 'contacted', 'closed']);

const toNullableText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const PATCH = withAuth(async (req, { supabase, user }, routeContext) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const params = (await routeContext?.params) as { id?: string } | undefined;
  const id = params?.id ?? '';
  if (!UUID_REGEX.test(id)) return jsonError('ID lead non valido', 400);

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};

  if (typeof body?.status === 'string') {
    const rawStatus = body.status.trim().toLowerCase();
    if (!STATUS_VALUES.has(rawStatus)) return jsonError('Status non valido', 400);
    update.status = rawStatus;
  }

  if ('notes' in body) {
    update.notes = toNullableText(body?.notes);
  }

  if (!Object.keys(update).length) return jsonError('Nessun campo da aggiornare', 400);

  const { data, error } = await supabase
    .from('ad_leads')
    .update(update)
    .eq('id', id)
    .select('id,created_at,name,company,email,phone,location,budget,message,status,notes,source')
    .single();

  if (error) {
    console.error('[admin/ads/leads] update error', error);
    return jsonError('Errore durante aggiornamento lead', 400);
  }

  return NextResponse.json({ data });
});
