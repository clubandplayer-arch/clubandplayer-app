type FanVoteBadgeProps = {
  count?: number | null;
  className?: string;
  compact?: boolean;
};

export default function FanVoteBadge({ count, className = '', compact = false }: FanVoteBadgeProps) {
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
  if (safeCount <= 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 ${className}`}
      title={`${safeCount} vot${safeCount === 1 ? 'o' : 'i'} Fan ricevut${safeCount === 1 ? 'o' : 'i'}`}
      aria-label={`${safeCount} vot${safeCount === 1 ? 'o' : 'i'} Fan ricevut${safeCount === 1 ? 'o' : 'i'}`}
    >
      <span aria-hidden="true">★</span>
      <span>{safeCount}</span>
      {!compact ? <span className="sr-only"> voti Fan</span> : null}
    </span>
  );
}
