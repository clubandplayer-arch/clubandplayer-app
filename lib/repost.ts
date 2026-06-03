import type { FeedPost } from '@/components/feed/postShared';

export const REPOST_SESSION_KEY = 'clubandplayer:repost-post';

export function openRepostComposer(post: FeedPost) {
  if (typeof window === 'undefined') return;

  window.sessionStorage.setItem(REPOST_SESSION_KEY, JSON.stringify(post));
  window.location.assign(`/feed?repost=${encodeURIComponent(String(post.id))}`);
}
