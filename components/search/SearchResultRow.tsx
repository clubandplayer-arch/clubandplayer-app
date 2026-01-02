'use client';

import Image from 'next/image';
import Link from 'next/link';

type SearchKind = 'opportunities' | 'clubs' | 'players' | 'posts' | 'events';

export type SearchResult = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  href: string;
  kind: SearchKind;
};

const KIND_LABELS: Record<SearchKind, string> = {
  opportunities: 'Opportunità',
  clubs: 'Club',
  players: 'Player',
  posts: 'Post',
  events: 'Eventi',
};

const KIND_STYLES: Record<SearchKind, string> = {
  opportunities: 'bg-amber-50 text-amber-700 border-amber-200',
  clubs: 'bg-blue-50 text-blue-700 border-blue-200',
  players: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  posts: 'bg-slate-50 text-slate-600 border-slate-200',
  events: 'bg-purple-50 text-purple-700 border-purple-200',
};

function Avatar({ result }: { result: SearchResult }) {
  const initial = result.title?.trim()?.[0]?.toUpperCase() || 'S';

  if (result.image_url) {
    return (
      <Image
        src={result.image_url}
        alt={result.title}
        width={44}
        height={44}
        className="h-11 w-11 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
      {initial}
    </div>
  );
}

export default function SearchResultRow({ result }: { result: SearchResult }) {
  return (
    <Link
      href={result.href}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-[var(--brand)] hover:bg-[var(--brand)]/5"
    >
      <Avatar result={result} />
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{result.title}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              KIND_STYLES[result.kind]
            }`}
          >
            {KIND_LABELS[result.kind]}
          </span>
        </div>
        {result.subtitle ? <div className="text-sm text-slate-600">{result.subtitle}</div> : null}
      </div>
    </Link>
  );
}
