import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

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

export const GET = withAuth(async (_req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const { data, error } = await adminClient
    .from('ad_campaigns')
    .select('id,name,status,priority,start_at,end_at,customer_name,customer_contact,notes,created_at')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/ads/campaigns] load error', error);
    return jsonError('Errore nel caricamento campagne', 400);
  }

  return NextResponse.json({ data: data ?? [] });
});

export const POST = withAuth(async (req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const body = await req.json().catch(() => ({}));
  const name = toNullableText(body?.name);
  const customerName = toNullableText(body?.customer_name);
  const customerContact = toNullableText(body?.customer_contact);
  const notes = toNullableText(body?.notes);
  if (!name) return jsonError('Nome campagna obbligatorio', 400);

  const rawStatus = typeof body?.status === 'string' ? body.status.trim().toLowerCase() : '';
  const status = rawStatus && STATUS_VALUES.has(rawStatus) ? rawStatus : 'paused';

  const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 0;

  const startAt = toNullableDate(body?.start_at);
  const endAt = toNullableDate(body?.end_at);

  const { data, error } = await adminClient
    .from('ad_campaigns')
    .insert({
      name,
      status,
      priority,
      start_at: startAt,
      end_at: endAt,
      customer_name: customerName,
      customer_contact: customerContact,
      notes,
    })
    .select('id,name,status,priority,start_at,end_at,customer_name,customer_contact,notes,created_at')
    .single();

  if (error) {
    console.error('[admin/ads/campaigns] create error', error);
    return jsonError('Errore durante la creazione campagna', 400);
  }

  return NextResponse.json({ data });
});
