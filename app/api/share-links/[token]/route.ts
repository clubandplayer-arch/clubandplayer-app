import { type NextRequest } from 'next/server';
import {
  dbError,
  invalidPayload,
  notAuthenticated,
  notFoundResponse,
  rlsDenied,
  successResponse,
} from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{
    token?: string;
  }>;
};

async function revokeShareLink(req: NextRequest, { params }: RouteParams) {
  const { token: rawToken } = await params;
  const token = rawToken?.trim();
  if (!token) {
    return invalidPayload('Token non valido');
  }

  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const { data: existing, error: selectError } = await supabase
    .from('share_links')
    .select('id, token, created_by, revoked_at, expires_at, resource_type, resource_id')
    .eq('token', token)
    .maybeSingle();

  if (selectError) {
    return dbError('Errore nel caricamento del link', { message: selectError.message });
  }

  if (!existing) {
    return notFoundResponse('Link non trovato');
  }

  if (existing.revoked_at) {
    return successResponse({
      shareLink: {
        token: existing.token,
        resourceType: existing.resource_type,
        resourceId: existing.resource_id,
        revokedAt: existing.revoked_at,
        expiresAt: existing.expires_at,
      },
      alreadyRevoked: true,
    });
  }

  const { data, error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('token, resource_type, resource_id, revoked_at, expires_at')
    .maybeSingle();

  if (error) {
    const code = (error as any)?.code as string | undefined;
    if (code === '42501') {
      return rlsDenied('Permessi insufficienti per revocare il link');
    }
    return dbError('Errore nella revoca del link', { message: error.message });
  }

  if (!data) {
    return dbError('Errore nella revoca del link');
  }

  return successResponse({
    shareLink: {
      token: data.token,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      revokedAt: data.revoked_at,
      expiresAt: data.expires_at,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: RouteParams) {
  return revokeShareLink(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteParams) {
  return revokeShareLink(req, ctx);
}
