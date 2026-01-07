'use client';

import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/common/ToastProvider';

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
      href: shareLink('https://wa.me/', { text: `${shareText}\n${url}` }),
    },
    {
      label: 'Telegram',
      href: shareLink('https://t.me/share/url', { url, text: shareText }),
    },
    {
      label: 'Facebook',
      href: shareLink('https://www.facebook.com/sharer/sharer.php', { u: url }),
    },
    {
      label: 'X',
      href: shareLink('https://twitter.com/intent/tweet', { url, text: shareText }),
    },
    {
      label: 'LinkedIn',
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

        <div className="flex flex-wrap gap-2">
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
            className="rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Copia link
          </button>
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </a>
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
