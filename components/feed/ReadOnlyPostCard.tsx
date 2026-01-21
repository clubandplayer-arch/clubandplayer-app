'use client';

import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';
import { buildClubDisplayName, buildProfileDisplayName } from '@/lib/displayName';
import { PostMedia } from '@/components/feed/PostMedia';
import { QuotedPostCard } from '@/components/feed/QuotedPostCard';
import {
  type FeedPost,
  domainFromUrl,
  firstUrl,
  formatEventDate,
} from '@/components/feed/postShared';

function FeedLinkCard({
  url,
  title,
  description,
  image,
}: {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="block overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm transition hover:shadow-md"
    >
      <div className="flex gap-3 p-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title || url} className="h-20 w-28 flex-shrink-0 rounded-lg object-cover" />
        ) : null}
        <div className="flex-1 space-y-1">
          <div className="text-xs uppercase text-gray-500">{domainFromUrl(url)}</div>
          <div className="text-sm font-semibold text-gray-900 line-clamp-2">{title || url}</div>
          {description ? <div className="text-xs text-gray-600 line-clamp-2">{description}</div> : null}
        </div>
      </div>
    </a>
  );
}

type ReadOnlyPostCardProps = {
  post: FeedPost;
};

export function ReadOnlyPostCard({ post }: ReadOnlyPostCardProps) {
  const isEvent = (post.kind ?? 'normal') === 'event';
  const eventDetails = post.event_payload;
  const baseDescription = post.content ?? post.text ?? '';
  const description = isEvent ? baseDescription || eventDetails?.description || '' : baseDescription;
  const authorProfile = post.author_profile ?? null;
  const authorAccountType = authorProfile?.account_type ?? authorProfile?.type ?? null;
  const fallbackAuthorLabel =
    (post as any).author_display_name ??
    (post as any).author_full_name ??
    (post as any).author_name ??
    (post as any).author ??
    null;
  const authorLabel = authorProfile
    ? authorAccountType === 'club'
      ? buildClubDisplayName(authorProfile.full_name, authorProfile.display_name, fallbackAuthorLabel ?? 'Club')
      : buildProfileDisplayName(
          authorProfile.full_name,
          authorProfile.display_name,
          fallbackAuthorLabel ?? 'Profilo',
        )
    : fallbackAuthorLabel;
  const authorId = authorProfile?.id ?? post.authorId ?? null;
  const profileHref = authorId ? (authorAccountType === 'club' ? `/clubs/${authorId}` : `/players/${authorId}`) : null;
  const avatarUrl = authorProfile?.avatar_url ?? (post as any).author_avatar_url ?? null;
  const linkUrl = post.link_url ?? firstUrl(description);
  const linkTitle = post.link_title ?? null;
  const linkDescription = post.link_description ?? null;
  const linkImage = post.link_image ?? null;
  const eventDateLabel = eventDetails?.date ? formatEventDate(eventDetails.date) : null;

  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {profileHref ? (
            <Link
              href={profileHref}
              aria-label={`Apri profilo ${authorLabel || 'autore post'}`}
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-slate-600"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={authorLabel || 'Avatar'}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden>{authorLabel ? authorLabel.charAt(0) : '✦'}</span>
              )}
            </Link>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={authorLabel || 'Avatar'}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden>{authorLabel ? authorLabel.charAt(0) : '✦'}</span>
              )}
            </div>
          )}
          <div className="space-y-0.5">
            {profileHref ? (
              <Link href={profileHref} className="text-sm font-semibold text-slate-900 hover:underline">
                {authorLabel || 'Post'}
              </Link>
            ) : (
              <div className="text-sm font-semibold text-slate-900">{authorLabel || 'Post'}</div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{post.createdAt ? new Date(post.createdAt).toLocaleString() : '—'}</span>
              {isEvent && eventDateLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-blue-800">
                  <CalendarGlyph className="h-3.5 w-3.5" aria-hidden />
                  <span>{eventDateLabel}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-4 text-base leading-relaxed text-gray-900">
        {description ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900 line-clamp-6">{description}</p>
        ) : null}

        {post.quoted_post_id ? (
          <QuotedPostCard post={post.quoted_post} missingText="Questo post non è più disponibile" />
        ) : null}

        <PostMedia
          postId={post.id}
          media={post.media}
          mediaUrl={post.media_url}
          mediaType={post.media_type}
          alt={isEvent ? eventDetails?.title ?? "Locandina dell'evento" : 'Media del post'}
        />

        {linkUrl ? <FeedLinkCard url={linkUrl} title={linkTitle} description={linkDescription} image={linkImage} /> : null}

        {isEvent && eventDetails?.location ? (
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <div className="font-semibold">{eventDetails.title}</div>
            <div>{eventDetails.location}</div>
            {eventDateLabel ? <div className="text-xs text-blue-800">{eventDateLabel}</div> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CalendarGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
