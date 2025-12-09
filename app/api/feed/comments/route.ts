import { type NextRequest } from 'next/server';
import {
  dbError,
  notAuthenticated,
  notReady,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  CommentsQuerySchema,
  CreateCommentSchema,
  type CommentsQueryInput,
  type CreateCommentInput,
} from '@/lib/validation/feed';

export const runtime = 'nodejs';

const MAX_LEN = 800;

function sanitizeBody(raw: unknown) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  return text.slice(0, MAX_LEN);
}

export async function GET(req: NextRequest) {
  const search = new URL(req.url).searchParams;
  const parsed = CommentsQuerySchema.safeParse(Object.fromEntries(search.entries()));

  if (!parsed.success) {
    return validationError('Parametri non validi', parsed.error.flatten());
  }

  const { postId, limit }: CommentsQueryInput = parsed.data;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, author_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 30);

  if (error) {
    const code = (error as any)?.code as string | undefined;
    if (code === '42501' || code === '42P01' || code === 'PGRST204') {
      return notReady('Commenti non pronti');
    }
    return unknownError({
      endpoint: '/api/feed/comments',
      error,
      context: { method: 'GET', stage: 'select', postId },
    });
  }

  const authorIds = Array.from(new Set((data ?? []).map((c) => c.author_id))).filter(Boolean) as string[];
  let authors: Record<string, any> = {};

  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, display_name, avatar_url, account_type, status')
      .in('user_id', authorIds);

    if (Array.isArray(profiles)) {
      authors = profiles.reduce((acc, p) => {
        const key = (p.user_id || p.id) as string;
        acc[key] = p;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  const comments = (data ?? []).map((c) => ({
    ...c,
    author: authors[c.author_id || ''] ?? null,
  }));

  return successResponse({ comments });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const bodyJson = await req.json().catch(() => ({}));
  const parsed = CreateCommentSchema.safeParse(bodyJson);
  if (!parsed.success) {
    console.warn('[api/feed/comments][POST] invalid payload', parsed.error.flatten());
    return validationError('Payload non valido', parsed.error.flatten());
  }

  const payload: CreateCommentInput = parsed.data;
  const postId = payload.postId;
  const body = sanitizeBody(payload.body);

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, body, author_id: auth.user.id })
    .select('id, post_id, author_id, body, created_at')
    .maybeSingle();

  if (error || !data) {
    const code = (error as any)?.code as string | undefined;
    if (code === '42501' || code === '42P01') {
      return notReady('Commenti non pronti');
    }
    return dbError('Errore nel salvataggio del commento', { message: error?.message });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, display_name, avatar_url, account_type, status')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  return successResponse({
    comment: {
      ...data,
      author: profile ?? null,
    },
  });
}
