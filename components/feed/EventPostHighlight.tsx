import type React from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';

type EventPostHighlightProps = {
  title?: string | null;
  dateLabel?: string | null;
  location?: string | null;
};

export function EventPostHighlight({ title, dateLabel, location }: EventPostHighlightProps) {
  const { t } = useI18n();
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-white/85 p-3 shadow-sm ring-1 ring-white/70">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-white shadow-sm">
          <span aria-hidden>✨</span>
          {t('feed.clubEvent')}
        </span>
        {dateLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-sky-800 ring-1 ring-sky-100">
            <CalendarGlyph className="h-3.5 w-3.5" aria-hidden />
            <span>{dateLabel}</span>
          </span>
        ) : null}
        {location ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-900 ring-1 ring-amber-100">
            <span aria-hidden>📍</span>
            <span>{location}</span>
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-lg font-black leading-tight text-slate-950">{title || t('feed.clubEventFallback')}</div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
        {t('feed.clubEventHighlight')}
      </p>
    </div>
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
