type VerifiedBadgeProps = {
  className?: string;
  label?: string;
};

export default function VerifiedBadge({ className = '', label = 'Verificato' }: VerifiedBadgeProps) {
  return (
    <span
      title="Profilo verificato"
      className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
