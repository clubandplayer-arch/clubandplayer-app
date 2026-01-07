'use client';

import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/common/ToastProvider';
import type React from 'react';

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  text?: string | null;
  url: string;
};

function shareLink(base: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return `${base}?${query}`;
}

export default function ShareModal({ open, onClose, title, text, url }: ShareModalProps) {
  const { toast } = useToast();
  const systemShareAvailable = typeof navigator !== 'undefined' && 'share' in navigator;
  const snippet = text?.trim() ? text.trim().slice(0, 160) : '';
  const shareText = [title, snippet].filter(Boolean).join(' - ');

  const links = [
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon />,
      href: shareLink('https://wa.me/', { text: `${shareText}\n${url}` }),
    },
    {
      label: 'Telegram',
      icon: <TelegramIcon />,
      href: shareLink('https://t.me/share/url', { url, text: shareText }),
    },
    {
      label: 'Facebook',
      icon: <FacebookIcon />,
      href: shareLink('https://www.facebook.com/sharer/sharer.php', { u: url }),
    },
    {
      label: 'X',
      icon: <XIcon />,
      href: shareLink('https://twitter.com/intent/tweet', { url, text: shareText }),
    },
    {
      label: 'LinkedIn',
      icon: <LinkedInIcon />,
      href: shareLink('https://www.linkedin.com/sharing/share-offsite/', { url }),
    },
  ];

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const tmp = document.createElement('input');
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      toast({ title: 'Link copiato', description: 'Il link è stato copiato negli appunti.' });
    } catch {
      toast({ title: 'Errore', description: 'Impossibile copiare il link.', variant: 'destructive' });
    }
  };

  const handleSystemShare = async () => {
    if (!systemShareAvailable) return;
    try {
      await navigator.share({ title, text: text || undefined, url });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast({ title: 'Condivisione non disponibile', description: 'Impossibile aprire il menu di sistema.' });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Condividi">
      <div className="space-y-4">
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {snippet ? <div className="mt-1 text-xs text-slate-600">{snippet}</div> : null}
          <div className="mt-2 truncate text-xs text-slate-500">{url}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {systemShareAvailable ? (
            <button
              type="button"
              onClick={handleSystemShare}
              className="rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Condivisione di sistema
            </button>
          ) : null}
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <CopyIcon />
            Copia link
          </button>
          {links.map((link) => (
            <ShareIconButton key={link.label} href={link.href} label={link.label} icon={link.icon} />
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instagram e TikTok</div>
          <p className="text-xs text-slate-600">Copia il link e incollalo nell'app per condividere.</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apri Instagram
            </a>
            <a
              href="https://www.tiktok.com"
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apri TikTok
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ShareIconButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex h-10 w-10 items-center justify-center rounded-full border text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      aria-label={label}
      title={label}
    >
      <span className="h-5 w-5">{icon}</span>
    </a>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1H6C4.9 1 4 1.9 4 3v12h2V3h10V1Zm3 4H10c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 16H10V7h9v14Z"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.52 3.48A11.86 11.86 0 0 0 12.02 0C5.4 0 .02 5.38.02 12c0 2.12.55 4.2 1.6 6.03L0 24l6.14-1.6A11.98 11.98 0 0 0 12 24h.01c6.62 0 12-5.38 12-12 0-3.2-1.25-6.21-3.49-8.52ZM12.01 22a9.93 9.93 0 0 1-5.06-1.4l-.36-.21-3.64.95.97-3.54-.23-.36A9.93 9.93 0 0 1 2 12c0-5.52 4.49-10 10.01-10 2.67 0 5.18 1.04 7.07 2.93A9.93 9.93 0 0 1 22 12c0 5.52-4.49 10-9.99 10Zm5.65-7.59c-.31-.16-1.85-.91-2.14-1.02-.29-.1-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.47.13-.63.14-.14.31-.36.47-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.54-.08-.16-.71-1.71-.97-2.35-.26-.63-.53-.54-.71-.54-.18 0-.39-.02-.6-.02-.21 0-.54.08-.82.39-.28.31-1.08 1.06-1.08 2.58s1.11 2.99 1.26 3.2c.16.21 2.19 3.35 5.31 4.7.74.32 1.31.51 1.76.65.74.24 1.41.21 1.94.13.59-.09 1.85-.75 2.11-1.48.26-.73.26-1.36.18-1.48-.08-.13-.29-.2-.6-.36Z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.04 15.47 8.8 19.1c.47 0 .67-.2.91-.44l2.18-2.08 4.52 3.3c.83.46 1.42.22 1.64-.77l2.98-13.96.01-.01c.26-1.2-.44-1.67-1.26-1.37L2.4 9.3C1.22 9.76 1.24 10.42 2.2 10.72l4.52 1.41 10.5-6.63c.49-.3.93-.13.57.17L9.04 15.47Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.68 0H1.32C.59 0 0 .59 0 1.32v21.36C0 23.41.59 24 1.32 24h11.5v-9.29H9.69v-3.62h3.13V8.41c0-3.1 1.89-4.79 4.65-4.79 1.32 0 2.46.1 2.79.14v3.24h-1.91c-1.5 0-1.79.71-1.79 1.76v2.31h3.58l-.47 3.62h-3.11V24h6.1C23.41 24 24 23.41 24 22.68V1.32C24 .59 23.41 0 22.68 0Z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.16 2H21l-6.2 7.08L22.5 22h-6.5l-5.08-6.63L4.7 22H1.86l6.64-7.59L1.5 2h6.66l4.6 6.07L18.16 2Zm-1.13 18h1.56L7.04 4H5.37l11.66 16Z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.45 20.45H17.2v-5.4c0-1.29-.02-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86v5.5H10.1V9h3.12v1.56h.04c.43-.82 1.5-1.68 3.09-1.68 3.3 0 3.9 2.17 3.9 5v6.57ZM6.56 7.56c-1 0-1.8-.82-1.8-1.82 0-1 .8-1.82 1.8-1.82 1 0 1.8.82 1.8 1.82 0 1-.8 1.82-1.8 1.82Zm1.63 12.89H4.93V9h3.26v11.45ZM22.23 0H1.77C.79 0 0 .78 0 1.74v20.51C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.23 0Z"
      />
    </svg>
  );
}
