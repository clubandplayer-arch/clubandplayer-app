type CertifiedCMarkProps = {
  className?: string;
};

export default function CertifiedCMarkSidebar({ className = '' }: CertifiedCMarkProps) {
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
        {/* MISURE #2 (OBBLIGATORIE): x=21 y=8 fontSize=8 */}
        <text
          x="21"
          y="8"
          textAnchor="middle"
          fontSize="8"
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
