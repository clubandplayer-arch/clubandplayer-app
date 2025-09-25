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
    <article className="rounded-xl border bg-white p-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={40} height={40} className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium">{headerTitle}</div>
          <div className="truncate text-xs text-gray-500">
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
              className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {mediaUrl && <div className="mt-3 h-56 w-full overflow-hidden rounded-lg bg-gray-100" />}

      {actions.length > 0 && (
        <footer className="mt-4 flex gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={
                a.variant === 'primary'
                  ? 'rounded-lg bg-blue-600 px-3 py-1.5 text-white'
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
