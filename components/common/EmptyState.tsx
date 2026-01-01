import Link from 'next/link';
import type React from 'react';

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
};

type EmptyStateProps = {
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  className?: string;
};

const ACTION_STYLES: Record<NonNullable<EmptyStateAction['variant']>, string> = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500',
  secondary:
    'border border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400',
};

export default function EmptyState({
  title,
  description,
  actions = [],
  className,
}: EmptyStateProps) {
  return (
    <div className={['glass-panel p-6 text-center', className].filter(Boolean).join(' ')}>
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {description ? <p className="mt-2 text-sm text-neutral-600">{description}</p> : null}
      {actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {actions.map((action) => {
            const variant = action.variant ?? 'secondary';
            const classes = `inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${ACTION_STYLES[variant]}`;
            if (action.href) {
              return (
                <Link key={action.label} href={action.href} className={classes}>
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={classes}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
