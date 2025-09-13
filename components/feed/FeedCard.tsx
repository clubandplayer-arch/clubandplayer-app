'use client';

import Image from 'next/image';

type Props = {
  avatarUrl?: string;
  headerTitle: string;
  headerSubtitle?: string;
  timeLabel?: string;
  title?: string;
  text?: string;
  tags?: string[];
  actions?: Array<{ label: string; onClick?: () => void; variant?: 'primary' | 'ghost' }>;
  mediaUrl?: string; // opzionale: future
};

export default function FeedCard({
  avatarUrl,
  headerTitle,
  headerSubtitle,
  timeLabel,
  title,
  text,
  tags = [],
  actions = [],
  mediaUrl,
}: Props) {
  return (
    <article className="bg-white rounded-xl border p-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={40} height={40} className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{headerTitle}</div>
          <div className="text-xs text-gray-500 truncate">
            {headerSubtitle ?? ''} {timeLabel ? `• ${timeLabel}` : ''}
          </div>
        </div>
      </header>

      {title && <div className="mt-3 font-semibold">{title}</div>}
      {text && <div className="mt-2 text-sm text-gray-700">{text}</div>}

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {mediaUrl && (
        <div className="mt-3 h-56 w-full rounded-lg bg-gray-100 overflow-hidden" />
      )}

      {actions.length > 0 && (
        <footer className="mt-4 flex gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={
                a.variant === 'primary'
                  ? 'rounded-lg bg-blue-600 text-white px-3 py-1.5'
                  : 'rounded-lg border px-3 py-1.5'
              }
            >
              {a.label}
            </button>
          ))}
        </footer>
      )}
    </article>
  );
}
