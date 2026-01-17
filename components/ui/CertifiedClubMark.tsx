type CertifiedClubMarkProps = {
  className?: string;
};

export default function CertifiedClubMark({ className = '' }: CertifiedClubMarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold leading-none text-[11px] text-[var(--brand)] ${className}`}
      title="Club certificato"
      aria-label="Club certificato"
    >
      C
    </span>
  );
}
