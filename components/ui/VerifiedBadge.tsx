import { BadgeCheck } from 'lucide-react';

type VerifiedBadgeProps = {
  className?: string;
  label?: string;
};

export default function VerifiedBadge({ className = '', label = 'Verificato' }: VerifiedBadgeProps) {
  return (
    <span
      title="Profilo verificato"
      className={`inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-inset ring-blue-200 ${className}`}
    >
      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
