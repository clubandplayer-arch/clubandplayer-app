import ShareIcon from '@/components/icons/ShareIcon';

type ShareButtonProps = {
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
};

export function ShareButton({ onClick, ariaLabel = 'Condividi', className = '' }: ShareButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center text-cp-brand transition hover:text-cp-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-brand/70 focus-visible:ring-offset-2 ${className}`}
    >
      <ShareIcon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{ariaLabel}</span>
    </button>
  );
}

