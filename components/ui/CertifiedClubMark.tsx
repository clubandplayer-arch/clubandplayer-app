type CertifiedClubMarkProps = {
  className?: string;
  size?: 'sm' | 'lg';
};

const SIZE_CLASSES = {
  sm: 'text-[11px]',
  lg: 'text-[16px]',
} as const;

export default function CertifiedClubMark({ className = '', size = 'sm' }: CertifiedClubMarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold leading-none text-[var(--brand)] ${SIZE_CLASSES[size]} ${className}`}
      title="Club certificato"
      aria-label="Club certificato"
    >
      C
    </span>
  );
}
