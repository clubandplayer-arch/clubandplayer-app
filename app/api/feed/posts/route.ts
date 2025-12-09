import { type NextRequest } from 'next/server';
import { dbError, notAuthenticated, successResponse, unknownError, validationError } from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_CHARS = 500;

function normalizePost(row: any) {
  return {
    id: row.id,
    content: row.content ?? row.text ?? '',
    text: row.text ?? row.content ?? '',
    created_at: row.created_at ?? null,
    createdAt: row.created_at ?? null,
    author_id: row.author_id ?? null,
    authorId: row.author_id ?? null,
    media_url: row.media_url ?? null,
    media_type: row.media_type ?? null,
    media_aspect: row.media_aspect ?? null,
    link_url: row.link_url ?? null,
    link_title: row.link_title ?? null,
    link_description: row.link_description ?? null,
    link_image: row.link_image ?? null,
    kind: row.kind ?? 'normal',
    event_payload: row.event_payload ?? null,
    quoted_post_id: row.quoted_post_id ?? null,
    quoted_post: row.quoted_post ?? null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 10, 50) : 10;

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[feed] GET /api/feed/posts error', error);
      return dbError('Errore durante il caricamento del feed');
    }

    const items = (data ?? []).map(normalizePost);

    return successResponse({
      items,
      nextPage: null,
    });
  } catch (error) {
    console.error('[feed] GET /api/feed/posts unexpected error', error);
    return unknownError({ endpoint: '/api/feed/posts', error });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return notAuthenticated('Devi essere autenticato per pubblicare');
    }

    const body = await req.json().catch(() => ({}));
    const rawContent =
      typeof body?.content === 'string'
        ? body.content
        : typeof body?.text === 'string'
          ? body.text
          : '';
    const content = rawContent.trim();

    if (!content) {
      return validationError('Il contenuto del post è obbligatorio', { error: 'empty' });
    }
    if (content.length > MAX_CHARS) {
      return validationError('Contenuto troppo lungo', { error: 'too_long', limit: MAX_CHARS });
    }

    const insertPayload = {
      author_id: auth.user.id,
      content,
      kind: 'normal' as const,
      media_url: null as string | null,
      media_type: null as string | null,
      media_aspect: null as string | null,
      link_url: null as string | null,
      link_title: null as string | null,
      link_description: null as string | null,
      link_image: null as string | null,
      quoted_post_id: null as string | null,
      event_payload: null as any,
    };

    const { data, error } = await supabase.from('posts').insert(insertPayload).select('*').single();

    if (error) {
      console.error('[feed] POST /api/feed/posts insert error', error);
      return dbError('Errore durante la creazione del post');
    }

    const post = normalizePost(data);

    return successResponse({
      post,
      items: [post],
      nextPage: null,
    });
  } catch (error) {
    console.error('[feed] POST /api/feed/posts unexpected error', error);
    return unknownError({ endpoint: '/api/feed/posts', error });
  }
}
