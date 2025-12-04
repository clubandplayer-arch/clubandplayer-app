export type ReactionType = 'like' | 'love' | 'care' | 'angry';

export type ReactionState = {
  counts: Record<ReactionType, number>;
  mine: ReactionType | null;
};

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
  return {
    id: p.id,
    content: p.content ?? p.text ?? '',
    createdAt: p.created_at ?? p.createdAt ?? null,
    authorId: p.author_id ?? p.authorId ?? null,
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
  };
}
