'use client';

interface VerticalAdBannerProps {
  className?: string;
}

export function VerticalAdBanner({ className }: VerticalAdBannerProps) {
  return (
    <div
      className={`glass-panel overflow-hidden ${className ?? ''}`}
      aria-label="Spazio pubblicitario"
      role="presentation"
    >
      <div className="flex h-48 flex-col justify-between rounded-xl bg-gradient-to-b from-slate-900 via-blue-900 to-blue-700 p-4 text-white shadow-inner">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-100">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold">
            AD
          </span>
          <span className="font-semibold">Sponsor</span>
        </div>
        <div className="space-y-2 text-left">
          <div className="text-lg font-bold leading-tight">Il tuo brand qui</div>
          <p className="text-sm text-blue-100">Spazio dedicato alle partnership e alle campagne dei nostri sponsor.</p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-blue-100">
          <span>cta.placeholder</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] uppercase tracking-wide">#adv</span>
        </div>
      </div>
    </div>
  );
}

export default VerticalAdBanner;
