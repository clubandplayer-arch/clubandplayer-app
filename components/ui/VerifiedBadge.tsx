type VerifiedBadgeProps = {
  className?: string;
  size?: 'sm' | 'md';
};

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-9 w-9',
};

export default function VerifiedBadge({ className = '', size = 'md' }: VerifiedBadgeProps) {
  return (
    <span
      title="Profilo verificato"
      aria-label="Profilo verificato"
      className={`inline-flex items-center ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${sizeClasses[size]} shrink-0`}
        aria-hidden="true"
      >
        <path
          className="text-amber-500"
          fill="currentColor"
          d="M12 2 14.1 3.3 16.6 2.9 17.8 5.2 20.1 6.4 19.7 8.9 21 11.9 19.7 14.1 20.1 16.6 17.8 17.8 16.6 20.1 14.1 19.7 12 21 9.9 19.7 7.4 20.1 6.2 17.8 3.9 16.6 4.3 14.1 3 12 4.3 8.9 3.9 6.4 6.2 5.2 7.4 2.9 9.9 3.3 12 2Z"
        />
        <path
          className="text-white"
          d="M8.2 12.3 10.7 14.8 15.8 9.7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}
