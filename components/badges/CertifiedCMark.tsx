type CertifiedCMarkProps = {
  className?: string;
};

export default function CertifiedCMark({ className = '' }: CertifiedCMarkProps) {
  return (
    <span
      aria-label="Club certificato"
      className={`inline-flex h-10 w-10 items-center justify-center bg-transparent shadow-none ring-0 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-hidden="true"
        className="block h-10 w-10 text-[var(--brand)] leading-none"
      >
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fontFamily="var(--font-righteous), 'Righteous', system-ui, -apple-system, 'Segoe UI', sans-serif"
          fill="currentColor"
        >
          C
        </text>
      </svg>
    </span>
  );
}
