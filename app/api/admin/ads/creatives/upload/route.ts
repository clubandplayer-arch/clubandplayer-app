import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);
const SLOT_VALUES = new Set(['left_top', 'left_bottom', 'sidebar_top', 'sidebar_bottom', 'feed_infeed']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sanitizeFileName = (name?: string | null) => {
  const base = (name || 'creative').toLowerCase().replace(/[^a-z0-9_.-]+/g, '-');
  return base.replace(/^-+|-+$/g, '') || 'creative';
};

const isAllowedExtension = (filename: string, mime: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeExt = mime.split('/')[1]?.toLowerCase() ?? '';
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_EXTENSIONS.has(mimeExt);
};

export const POST = withAuth(async (req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const form = await req.formData();
  const fileEntry = form.get('file');

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return jsonError('File mancante', 400);
  }

  const file = fileEntry as File;
  if (file.size > MAX_BYTES) {
    return jsonError('File troppo grande', 400, { limitBytes: MAX_BYTES });
  }

  const contentType = file.type || '';
  if (!contentType.startsWith('image/')) {
    return jsonError('Formato non supportato', 400);
  }

  if (!isAllowedExtension(file.name, contentType)) {
    return jsonError('Estensione non supportata', 400);
  }

  const campaignId = typeof form.get('campaignId') === 'string' ? String(form.get('campaignId')).trim() : '';
  if (campaignId && !UUID_REGEX.test(campaignId)) {
    return jsonError('campaignId non valido', 400);
  }

  const slot = typeof form.get('slot') === 'string' ? String(form.get('slot')).trim() : '';
  if (slot && !SLOT_VALUES.has(slot)) {
    return jsonError('Slot non valido', 400);
  }

  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = sanitizeFileName(file.name);
  const slotPrefix = slot ? `${slot}-` : '';
  const path = `ads/${campaignId || 'unknown'}/${yearMonth}/${crypto.randomUUID()}-${slotPrefix}${filename}`;

  const { error: uploadError } = await adminClient.storage.from('ads-creatives').upload(path, buffer, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    console.error('[admin/ads/creatives/upload] upload error', uploadError);
    return jsonError('Errore durante upload', 500);
  }

  const { data: urlData } = adminClient.storage.from('ads-creatives').getPublicUrl(path);
  const publicUrl = urlData?.publicUrl ?? null;
  if (!publicUrl) return jsonError('Public URL non disponibile', 500);

  return NextResponse.json({
    ok: true,
    path,
    publicUrl,
    contentType,
    size: file.size,
  });
});
