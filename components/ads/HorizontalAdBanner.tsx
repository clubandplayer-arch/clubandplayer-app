'use client';

interface HorizontalAdBannerProps {
  className?: string;
}

export function HorizontalAdBanner({ className }: HorizontalAdBannerProps) {
  return (
    <div
      className={`glass-panel overflow-hidden ${className ?? ''}`}
      aria-label="Spazio pubblicitario"
      role="presentation"
    >
      <div className="relative isolate flex flex-col gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-amber-100 via-orange-100 to-amber-200 p-4 text-amber-900 shadow-inner sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-xs font-semibold uppercase text-amber-700 shadow">AD</span>
          <div className="space-y-1">
            <div className="text-base font-semibold leading-tight">Spazio pubblicitario</div>
            <p className="text-sm text-amber-800">Il tuo messaggio promozionale può apparire qui senza disturbare il feed.</p>
          </div>
        </div>
        <a
          href="#"
          className="inline-flex w-fit items-center justify-center rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-50 shadow transition hover:bg-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          Scopri di più
        </a>
      </div>
    </div>
  );
}

export default HorizontalAdBanner;
