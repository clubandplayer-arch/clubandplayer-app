'use client';

import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommentsSection } from '@/components/feed/CommentsSection';
import { PostIconDelete, PostIconEdit, PostIconShare } from '@/components/icons/PostActionIcons';
import { PostMedia } from '@/components/feed/PostMedia';
import { QuotedPostCard } from '@/components/feed/QuotedPostCard';
import CertifiedCMarkSidebar from '@/components/badges/CertifiedCMarkSidebar';
import { createPostShareLink } from '@/lib/share';
import { buildClubDisplayName, buildProfileDisplayName } from '@/lib/displayName';
import ShareModal from '@/components/feed/ShareModal';
import {
  REACTION_EMOJI,
  REACTION_ORDER,
  type ReactionType,
  type ReactionState,
  type FeedPost,
  formatEventDate,
  firstUrl,
  domainFromUrl,
} from './postShared';

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

export type PostCardProps = {
  post: FeedPost;
  currentUserId: string | null;
  reaction: ReactionState;
  commentCount: number;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onToggleReaction: (type: ReactionType) => void;
  onCommentCountChange?: (next: number) => void;
  onUpdated?: (next: FeedPost) => void;
  onDeleted?: (id: string) => void;
};

export function PostCard({
  post,
  currentUserId,
  onUpdated,
  onDeleted,
  reaction,
  commentCount,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  onToggleReaction,
  onCommentCountChange,
}: PostCardProps) {
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
  const showCertifiedBadge = authorProfile?.is_verified === true;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const linkUrl = post.link_url ?? firstUrl(description);
  const linkTitle = post.link_title ?? null;
  const linkDescription = post.link_description ?? null;
  const linkImage = post.link_image ?? null;
  const isOwner = currentUserId != null && post.authorId === currentUserId;
  const editAreaId = `post-edit-${post.id}`;
  const errorId = error ? `post-error-${post.id}` : undefined;
  const eventDateLabel = eventDetails?.date ? formatEventDate(eventDetails.date) : null;
  const [commentSignal, setCommentSignal] = useState(0);

  const shareTitle = isEvent ? eventDetails?.title ?? 'Evento del club' : 'Post del feed';
  const shareMessage = useMemo(() => {
    if (isEvent) return eventDetails?.title ?? description;
    return description || shareTitle;
  }, [description, eventDetails?.title, isEvent, shareTitle]);

  const ensureShareUrl = useCallback(async () => {
    if (shareUrl) return shareUrl;
    setShareLoading(true);
    setError(null);
    try {
      const url = await createPostShareLink(String(post.id));
      setShareUrl(url);
      return url;
    } catch (err: any) {
      setError(err?.message || 'Impossibile creare il link di condivisione');
      return '';
    } finally {
      setShareLoading(false);
    }
  }, [post.id, shareUrl]);

  const handleShare = useCallback(async () => {
    const url = await ensureShareUrl();
    if (!url) return;
    const isMobile =
      typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const shareText = `${shareMessage}\n${url}`;

    if (isMobile && typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
      }
    }

    setShareOpen(true);
  }, [ensureShareUrl, shareMessage, shareTitle]);

  const reactionSummaryParts = REACTION_ORDER.filter((key) => (reaction.counts[key] || 0) > 0).map(
    (key) => `${REACTION_EMOJI[key]} ${reaction.counts[key]}`,
  );
  const totalReactions = REACTION_ORDER.reduce((acc, key) => acc + (reaction.counts[key] || 0), 0);
  const reactionSummaryText = reactionSummaryParts.length ? reactionSummaryParts.join(' · ') : 'Nessuna reazione';

  const actionIconClass = 'text-[18px] leading-none align-middle';

  useEffect(() => {
    if (!editing) setText(description);
  }, [description, editing, post]);

  async function saveEdit() {
    const payload = text.trim();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/posts/${post.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.item) throw new Error(json?.error || 'Salvataggio fallito');
      onUpdated?.({ ...post, ...json.item });
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!confirm('Sei sicuro di voler eliminare questo post?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/posts/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Eliminazione fallita');
      onDeleted?.(post.id);
    } catch (e: any) {
      setError(e?.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="relative mb-4 overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
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
            {showCertifiedBadge ? (
              <span className="absolute -top-1 -right-1 text-[var(--brand)]" aria-label="Club certificato">
                <CertifiedCMarkSidebar />
              </span>
            ) : null}
          </div>
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
        <div className="flex items-center gap-1 text-slate-700">
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full p-2 transition hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Modifica questo post"
                disabled={saving}
              >
                <PostIconEdit className={actionIconClass} aria-hidden />
              </button>
              <button
                type="button"
                onClick={deletePost}
                className="rounded-full p-2 transition hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Elimina questo post"
                disabled={saving}
              >
                <PostIconDelete className={actionIconClass} aria-hidden />
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={handleShare}
            aria-label={isEvent ? 'Condividi questo evento' : 'Condividi questo post'}
            className="rounded-full p-2 transition hover:bg-neutral-100 hover:text-neutral-900"
            disabled={shareLoading}
          >
            <PostIconShare className={actionIconClass} aria-hidden />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <label htmlFor={editAreaId} className="sr-only">
            Modifica il contenuto del post
          </label>
          <textarea
            id={editAreaId}
            className="w-full resize-y rounded-lg border px-3 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            disabled={saving}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="rounded-lg bg-gray-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setText(description);
              }}
              disabled={saving}
              className="rounded-lg px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
          {error ? (
            <div id={errorId} className="text-xs text-red-600" role="status">
              {error}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-4 text-base leading-relaxed text-gray-900">
          {description ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900 line-clamp-6">{description}</p>
          ) : null}

          {post.quoted_post_id ? (
            <QuotedPostCard
              post={post.quoted_post}
              missingText="Questo post non è più disponibile"
            />
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
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-600">
        <div>
          {reaction.mine ? (
            <span className="font-semibold text-[var(--brand)]">
              Tu{totalReactions > 1 ? ` e altre ${totalReactions - 1} persone` : ''}
            </span>
          ) : null}{' '}
          {reactionSummaryText}
        </div>
        <div>{commentCount > 0 ? `${commentCount} commenti` : 'Nessun commento'}</div>
      </div>

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm font-semibold text-neutral-700"
        onMouseLeave={onClosePicker}
      >
        <div className="relative inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleReaction('like')}
            onMouseEnter={onOpenPicker}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
              reaction.mine
                ? 'bg-[var(--brand)]/10 text-[var(--brand)] shadow-inner'
                : 'bg-slate-50 text-neutral-800 hover:bg-slate-100'
            }`}
            aria-pressed={reaction.mine === 'like'}
          >
            <span aria-hidden className="text-xl">{REACTION_EMOJI[reaction.mine ?? 'like']}</span>
            <span>Reagisci</span>
          </button>

          <button
            type="button"
            className="rounded-full bg-slate-50 px-2 py-1 text-[11px] text-neutral-600 shadow-inner transition hover:bg-slate-100"
            onClick={() => (pickerOpen ? onClosePicker() : onOpenPicker())}
            aria-label="Scegli reazione"
          >
            ⋯
          </button>

          {pickerOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 flex gap-2 rounded-full border border-slate-100 bg-white px-2 py-1 shadow-lg">
              {REACTION_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onToggleReaction(r);
                    onClosePicker();
                  }}
                  className={`flex items-center justify-center rounded-full px-2 py-1 text-xl transition ${
                    reaction.mine === r ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'hover:bg-neutral-100'
                  }`}
                >
                  <span aria-hidden>{REACTION_EMOJI[r]}</span>
                  <span className="sr-only">{r}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-neutral-800 transition hover:bg-slate-100"
          onClick={() => setCommentSignal((v) => v + 1)}
        >
          <span aria-hidden>💬</span>
          <span>Commenta</span>
        </button>
      </div>

      <CommentsSection
        postId={String(post.id)}
        initialCount={commentCount}
        expandSignal={commentSignal}
        onCountChange={onCommentCountChange}
        currentUserId={currentUserId}
      />
      {error ? (
        <div id={errorId} className="mt-2 text-xs text-red-600" role="status">
          {error}
        </div>
      ) : null}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={shareTitle}
        text={shareMessage}
        url={shareUrl}
      />
    </article>
  );
}

function CalendarGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
