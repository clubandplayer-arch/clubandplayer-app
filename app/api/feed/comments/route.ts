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
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const MAX_LEN = 800;

function sanitizeBody(raw: unknown) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  return text.slice(0, MAX_LEN);
}

async function buildClubVerificationMap(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, clubIds: string[]) {
  if (!clubIds.length) return new Map<string, boolean>();
  try {
    const admin = getSupabaseAdminClientOrNull();
    const verificationClient = admin ?? supabase;
    const { data, error } = await verificationClient
      .from('club_verification_requests')
      .select('club_id, status, payment_status, verified_until, created_at')
      .in('club_id', clubIds)
      .eq('status', 'approved')
      .in('payment_status', ['paid', 'waived'])
      .gt('verified_until', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    const map = new Map<string, boolean>();
    (data ?? []).forEach((row: any) => {
      if (!row?.club_id || map.has(String(row.club_id))) return;
      map.set(String(row.club_id), true);
    });
    return map;
  } catch (error) {
    console.error('[api/feed/comments] club verification lookup failed', {
      message: error instanceof Error ? error.message : (error as any)?.message ?? null,
      details: (error as any)?.details ?? null,
      hint: (error as any)?.hint ?? null,
      code: (error as any)?.code ?? null,
    });
    return new Map<string, boolean>();
  }
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
  const authors: Record<string, any> = {};

  if (authorIds.length > 0) {
    const { data: profilesByUser } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, display_name, avatar_url, account_type, status')
      .in('user_id', authorIds);

    const storeProfile = (p: any) => {
      if (!p) return;
      const keyUser = (p as any)?.user_id ? String((p as any).user_id) : null;
      const keyId = (p as any)?.id ? String((p as any).id) : null;
      if (keyUser) authors[keyUser] = p;
      if (keyId && !authors[keyId]) authors[keyId] = p;
    };

    (profilesByUser ?? []).forEach(storeProfile);

    const missingByUserId = authorIds.filter((id) => !authors[id]);

    if (missingByUserId.length) {
      const { data: profilesById } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, display_name, avatar_url, account_type, status')
        .in('id', missingByUserId);

      (profilesById ?? []).forEach(storeProfile);
    }
  }

  const clubProfileIds = Array.from(
    new Set(
      Object.values(authors)
        .filter((author) => author?.account_type === 'club' && author?.id)
        .map((author) => String(author.id)),
    ),
  );
  const clubVerificationMap = await buildClubVerificationMap(supabase, clubProfileIds);

  const comments = (data ?? []).map((c) => ({
    ...c,
    author: (() => {
      const author = authors[c.author_id || ''] ?? null;
      if (!author) return null;
      const isClub = author.account_type === 'club';
      const isVerified = isClub ? clubVerificationMap.get(String(author.id)) ?? false : null;
      return { ...author, is_verified: isVerified };
    })(),
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

  const verificationMap = profile?.id ? await buildClubVerificationMap(supabase, [String(profile.id)]) : new Map();
  const isClub = profile?.account_type === 'club';
  const profileWithVerification = profile
    ? { ...profile, is_verified: isClub ? verificationMap.get(String(profile.id)) ?? false : null }
    : null;

  return successResponse({
    comment: {
      ...data,
      author: profileWithVerification,
    },
  });
}
