'use client';

import { PostMedia } from '@/components/feed/PostMedia';
import { domainFromUrl, firstUrl, type FeedPost } from '@/components/feed/postShared';

type Props = {
  post?: FeedPost | null;
  onRemove?: () => void;
  missingText?: string;
};

export function QuotedPostCard({ post, onRemove, missingText = 'Questo post non è più disponibile' }: Props) {
  const createdAt = post?.created_at || post?.createdAt;
  const linkUrl = post?.link_url || firstUrl(post?.content || post?.text || '') || null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white/60 p-3">
      <div className="flex items-start justify-between gap-2 text-[11px] text-neutral-500">
        <div>{createdAt ? new Date(createdAt).toLocaleString() : '—'}</div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full px-2 py-1 text-[11px] font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            Rimuovi
          </button>
        ) : null}
      </div>

      {post ? (
        <div className="mt-1 space-y-2 text-sm text-neutral-800">
          {post.content ? <p className="whitespace-pre-wrap leading-relaxed line-clamp-4">{post.content}</p> : null}

          <PostMedia
            postId={post.id}
            media={post.media}
            mediaUrl={post.media_url}
            mediaType={post.media_type}
            alt={post.content || 'Media del post citato'}
          />

          {linkUrl ? (
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-700 underline-offset-4 hover:underline"
            >
              <span>{domainFromUrl(linkUrl)}</span>
            </a>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 rounded border border-dashed border-neutral-300 bg-neutral-50 p-2 text-sm text-neutral-500">
          {missingText}
        </div>
      )}
    </div>
  );
}
