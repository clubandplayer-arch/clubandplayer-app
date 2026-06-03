'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PostIconRepost } from '@/components/icons/PostActionIcons';
import { PostMedia } from '@/components/feed/PostMedia';
import { domainFromUrl, firstUrl, type FeedPost } from '@/components/feed/postShared';
import { buildClubDisplayName, buildProfileDisplayName } from '@/lib/displayName';

type Props = {
  post?: FeedPost | null;
  onRemove?: () => void;
  onRepost?: (post: FeedPost) => void;
  missingText?: string;
};

export function QuotedPostCard({ post, onRemove, onRepost, missingText = 'Questo post non è più disponibile' }: Props) {
  const createdAt = post?.created_at || post?.createdAt;
  const linkUrl = post?.link_url || firstUrl(post?.content || post?.text || '') || null;
  const authorProfile = post?.author_profile ?? null;
  const authorAccountType = authorProfile?.account_type ?? authorProfile?.type ?? post?.author_account_type ?? null;
  const fallbackAuthorLabel = post?.author_display_name ?? null;
  const authorLabel = authorProfile
    ? authorAccountType === 'club'
      ? buildClubDisplayName(authorProfile.full_name, authorProfile.display_name, fallbackAuthorLabel ?? 'Club')
      : buildProfileDisplayName(
          authorProfile.full_name,
          authorProfile.display_name,
          fallbackAuthorLabel ?? 'Profilo',
        )
    : fallbackAuthorLabel ?? 'Autore originale';
  const authorId = authorProfile?.id ?? post?.author_profile_id ?? null;
  const isClubAuthor = authorAccountType === 'club';
  const profileHref = authorId ? (isClubAuthor ? `/clubs/${authorId}` : `/players/${authorId}`) : null;
  const avatarUrl = authorProfile?.avatar_url ?? post?.author_avatar_url ?? null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white/70 p-3">
      <div className="flex items-start justify-between gap-3">
        {post ? (
          <div className="flex min-w-0 items-center gap-2">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={authorLabel}
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                <span aria-hidden>{authorLabel.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Post originale</div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                {profileHref ? (
                  <Link href={profileHref} className="max-w-full truncate text-sm font-semibold text-slate-900 hover:underline">
                    {authorLabel}
                  </Link>
                ) : (
                  <span className="max-w-full truncate text-sm font-semibold text-slate-900">{authorLabel}</span>
                )}
                <span>{createdAt ? new Date(createdAt).toLocaleString() : '—'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Post originale</div>
        )}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            Rimuovi
          </button>
        ) : null}
      </div>

      {post ? (
        <div className="mt-3 space-y-3 text-sm text-neutral-800">
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

          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2">
            <Link
              href={`/posts/${post.id}`}
              className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-slate-100"
            >
              Vedi post originale
            </Link>
            {onRepost ? (
              <button
                type="button"
                onClick={() => onRepost(post)}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-slate-100"
              >
                <PostIconRepost className="text-[16px] leading-none" aria-hidden />
                <span>Repost</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-2 rounded border border-dashed border-neutral-300 bg-neutral-50 p-2 text-sm text-neutral-500">
          {missingText}
        </div>
      )}
    </div>
  );
}
