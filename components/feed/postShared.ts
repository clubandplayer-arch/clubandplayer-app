export type ReactionType = 'like' | 'love' | 'care' | 'angry';

export type ReactionState = {
  counts: Record<ReactionType, number>;
  mine: ReactionType | null;
};

export type FeedAuthorProfile = {
  id?: string | null;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  type?: string | null;
};

function normalizeAuthorProfile(raw: any): FeedAuthorProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: (raw as any)?.id ?? null,
    user_id: (raw as any)?.user_id ?? null,
    full_name: (raw as any)?.full_name ?? null,
    display_name: (raw as any)?.display_name ?? (raw as any)?.name ?? null,
    avatar_url: (raw as any)?.avatar_url ?? null,
    account_type: (raw as any)?.account_type ?? (raw as any)?.type ?? null,
    type: (raw as any)?.type ?? (raw as any)?.account_type ?? null,
  };
}

export type EventPayload = {
  title: string;
  date: string;
  description?: string | null;
  location?: string | null;
  poster_url?: string | null;
  poster_path?: string | null;
  poster_bucket?: string | null;
};

export type FeedPost = {
  id: string;
  content?: string;
  text?: string;
  created_at?: string | null;
  createdAt?: string | null;
  author_id?: string | null;
  authorId?: string | null;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  author_profile_id?: string | null;
  author_user_id?: string | null;
  author_role?: 'club' | 'athlete' | null;
  author_profile?: FeedAuthorProfile | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  media_aspect?: '16:9' | '9:16' | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
  kind?: 'normal' | 'event';
  event_payload?: EventPayload | null;
  quoted_post_id?: string | null;
  quoted_post?: FeedPost | null;
};

export const REACTION_ORDER: ReactionType[] = ['like', 'love', 'care', 'angry'];
export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  care: '🤗',
  angry: '😡',
};

export const defaultReactionState: ReactionState = {
  counts: { like: 0, love: 0, care: 0, angry: 0 },
  mine: null,
};

export function createDefaultReaction(): ReactionState {
  return { counts: { ...defaultReactionState.counts }, mine: null };
}

export function computeOptimistic(prev: ReactionState, nextMine: ReactionType | null): ReactionState {
  const counts: ReactionState['counts'] = { ...prev.counts };
  if (prev.mine) counts[prev.mine] = Math.max(0, (counts[prev.mine] || 0) - 1);
  if (nextMine) counts[nextMine] = (counts[nextMine] || 0) + 1;
  return { counts, mine: nextMine };
}

export function firstUrl(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

export function normalizeAspect(raw?: string | null): '16:9' | '9:16' | null {
  if (!raw) return null;
  const v = raw.trim();
  if (v === '16:9' || v === '16-9') return '16:9';
  if (v === '9:16' || v === '9-16') return '9:16';
  return null;
}

export function aspectFromUrl(url?: string | null): '16:9' | '9:16' | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const raw = u.searchParams.get('aspect');
    return normalizeAspect(raw);
  } catch {
    return null;
  }
}

export function normalizeEventPayload(raw: any): EventPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const date = typeof raw.date === 'string' ? raw.date.trim() : '';
  if (!title || !date) return null;
  return {
    title,
    date,
    description: typeof raw.description === 'string' ? raw.description.trim() || null : null,
    location: typeof raw.location === 'string' ? raw.location.trim() || null : null,
    poster_url: typeof raw.poster_url === 'string' ? raw.poster_url || null : null,
    poster_path: typeof raw.poster_path === 'string' ? raw.poster_path || null : null,
    poster_bucket: typeof raw.poster_bucket === 'string' ? raw.poster_bucket || null : null,
  };
}

export function formatEventDate(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  const hasTime = /\d{2}:\d{2}/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'long' };
  if (hasTime) opts.timeStyle = 'short';
  return new Intl.DateTimeFormat('it-IT', opts).format(date);
}

export function domainFromUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function normalizePost(p: any, depth = 0): FeedPost {
  const aspect = aspectFromUrl(p?.media_url);
  const quoted = depth === 0 && p?.quoted_post ? normalizePost(p.quoted_post, depth + 1) : null;
  const authorProfile = normalizeAuthorProfile(p?.author_profile ?? p?.author ?? null);
  const authorProfileId = p?.author_profile_id ?? authorProfile?.id ?? p?.author?.id ?? null;
  const authorUserId = p?.author_user_id ?? authorProfile?.user_id ?? p?.author?.user_id ?? null;
  const authorDisplayName =
    authorProfile?.full_name ??
    authorProfile?.display_name ??
    p?.author_display_name ??
    p?.author_full_name ??
    p?.author_name ??
    p?.author ??
    null;
  const authorAvatarUrl = authorProfile?.avatar_url ?? p?.author_avatar_url ?? p?.author?.avatar_url ?? null;
  return {
    id: p.id,
    content: p.content ?? p.text ?? '',
    createdAt: p.created_at ?? p.createdAt ?? null,
    authorId: p.author_id ?? p.authorId ?? authorUserId ?? null,
    media_url: p.media_url ?? null,
    media_type: p.media_type ?? null,
    media_aspect: normalizeAspect(p.media_aspect) ?? aspect ?? null,
    link_url: p.link_url ?? p.linkUrl ?? firstUrl(p.content ?? p.text ?? null),
    link_title: p.link_title ?? p.linkTitle ?? null,
    link_description: p.link_description ?? p.linkDescription ?? null,
    link_image: p.link_image ?? p.linkImage ?? null,
    kind: p.kind === 'event' ? 'event' : 'normal',
    event_payload: normalizeEventPayload(p.event_payload ?? p.event ?? null),
    quoted_post_id: p.quoted_post_id ?? p.quotedPostId ?? null,
    quoted_post: quoted,
    author_display_name: authorDisplayName,
    author_avatar_url: authorAvatarUrl,
    author_profile_id: authorProfileId,
    author_user_id: authorUserId,
    author_profile: authorProfile,
  };
}
