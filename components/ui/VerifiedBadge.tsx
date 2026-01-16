type VerifiedBadgeProps = {
  className?: string;
  label?: string;
};

export default function VerifiedBadge({ className = '', label = 'Certified' }: VerifiedBadgeProps) {
  return (
    <span
      title="Profilo verificato"
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
