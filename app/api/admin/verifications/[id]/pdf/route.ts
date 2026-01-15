import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const BUCKET = 'club-verification-certs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const params = await routeContext?.params;
  const id = typeof params?.id === 'string' ? params.id : '';
  if (!id) return jsonError('Id mancante', 400);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const { data, error } = await adminClient
    .from('club_verification_requests')
    .select('certificate_path')
    .eq('id', id)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  const path = data?.certificate_path as string | null;
  if (!path) return jsonError('Certificato non disponibile', 404);

  const { data: signed, error: signedError } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 5);

  if (signedError) return jsonError(signedError.message, 400);

  return NextResponse.json({ url: signed?.signedUrl ?? null });
});
