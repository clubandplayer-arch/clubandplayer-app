import { type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import {
  dbError,
  invalidPayload,
  notAuthenticated,
  notAuthorized,
  notFoundResponse,
  rlsDenied,
  successResponse,
} from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CreateShareLinkSchema, type CreateShareLinkInput } from '@/lib/validation/shareLinks';

export const runtime = 'nodejs';

const MAX_TOKEN_ATTEMPTS = 3;

function generateToken() {
  return randomBytes(32).toString('base64url');
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateShareLinkSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Payload non valido', parsed.error.flatten());
  }

  const payload: CreateShareLinkInput = parsed.data;
  const { resourceId, resourceType, expiresAt } = payload;

  if (resourceType === 'post') {
    const { data: post, error } = await supabase
      .from('feed_posts')
      .select('id, author_id')
      .eq('id', resourceId)
      .maybeSingle();

    if (error) {
      return dbError('Errore nel caricamento del post', { message: error.message });
    }

    if (!post) {
      return notFoundResponse('Post non trovato');
    }

    if (post.author_id !== auth.user.id) {
      return notAuthorized('Non sei autorizzato a condividere questo contenuto');
    }
  }

  const expiresAtIso = expiresAt ? expiresAt.toISOString() : null;

  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt += 1) {
    const token = generateToken();
    const { data, error } = await supabase
      .from('share_links')
      .insert({
        token,
        resource_type: resourceType,
        resource_id: resourceId,
        created_by: auth.user.id,
        expires_at: expiresAtIso,
      })
      .select('token, resource_type, resource_id, created_at, expires_at, revoked_at')
      .maybeSingle();

    if (error) {
      const code = (error as any)?.code as string | undefined;
      if (code === '23505') {
        continue;
      }
      if (code === '42501') {
        return rlsDenied('Permessi insufficienti per creare il link');
      }
      return dbError('Errore nella creazione del link', { message: error.message });
    }

    if (!data) {
      return dbError('Errore nella creazione del link');
    }

    const shareUrl = `${req.nextUrl.origin}/s/${data.token}`;

    return successResponse({
      shareLink: {
        token: data.token,
        url: shareUrl,
        resourceType: data.resource_type,
        resourceId: data.resource_id,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        revokedAt: data.revoked_at,
      },
    });
  }

  return dbError('Impossibile generare un token univoco');
}
