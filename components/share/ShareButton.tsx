'use client';

import { useCallback, useMemo, useState } from 'react';
import ShareArrowIcon from './ShareArrowIcon';
import { buildFeedPostShareUrl, copyLinkToClipboard, resolveShareUrl, shareViaWebApi } from '@/lib/share';

export type ShareButtonProps = {
  url?: string | null;
  title: string;
  text?: string | null;
  ariaLabel?: string;
  variant?: 'ghost' | 'solid';
  size?: 'sm' | 'md';
  className?: string;
  onShared?: () => void;
};

export function buildPostPermalink(postId: string) {
  return buildFeedPostShareUrl(postId);
}

export default function ShareButton({
  url,
  title,
  text,
  ariaLabel,
  variant = 'ghost',
  size = 'md',
  className,
  onShared,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => resolveShareUrl(url), [url]);

  const buttonBase =
    'inline-flex items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600';
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-9 w-9 text-sm';
  const variantClass =
    variant === 'solid'
      ? 'border-transparent bg-neutral-900 text-white hover:bg-neutral-800'
      : 'border-neutral-200 bg-white/90 text-neutral-700 hover:bg-white';

  const handleShare = useCallback(async () => {
    const target = shareUrl || resolveShareUrl();
    const { usedNative, error } = await shareViaWebApi({
      title,
      text: text ?? undefined,
      url: target,
    });

    if (usedNative && !error) {
      onShared?.();
      setOpen(false);
      return;
    }

    if (target) {
      setOpen((curr) => !curr);
    }
  }, [onShared, shareUrl, text, title]);

  const handleCopy = useCallback(async () => {
    const target = shareUrl || resolveShareUrl();
    if (!target) return;
    const ok = await copyLinkToClipboard(target);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1500);
  }, [shareUrl]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        type="button"
        aria-label={ariaLabel ?? 'Condividi'}
        onClick={handleShare}
        className={`${buttonBase} ${sizeClass} ${variantClass}`}
      >
        <ShareArrowIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-neutral-200 bg-white/95 p-3 text-xs shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="text-[11px] font-semibold text-neutral-800">Condividi il link</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl || ''}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex-shrink-0 rounded-lg bg-neutral-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-neutral-800"
            >
              Copia
            </button>
          </div>
          <div className="mt-1 text-[11px] text-neutral-600">
            Incolla su WhatsApp, X, Facebook, Instagram, TikTok…
          </div>
          {copied ? (
            <div className="mt-1 text-[11px] font-semibold text-green-700">Link copiato negli appunti</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
