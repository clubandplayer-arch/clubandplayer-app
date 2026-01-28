'use client';

import type { MouseEventHandler } from 'react';

const defaultLabel = 'Continua con Google';

type GoogleAuthButtonProps = {
  label?: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

export default function GoogleAuthButton({
  label = defaultLabel,
  onClick,
  disabled,
}: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-start gap-3 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.81-.07-1.62-.22-2.41H12v4.56h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.77z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.08 7.95-2.93l-3.87-3c-1.08.73-2.46 1.15-4.08 1.15-3.14 0-5.8-2.12-6.76-4.97H1.29v3.12A12 12 0 0 0 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.24 14.25A7.2 7.2 0 0 1 4.86 12c0-.78.14-1.54.38-2.25V6.63H1.29A12 12 0 0 0 0 12c0 1.94.47 3.77 1.29 5.37l3.95-3.12z"
          />
          <path
            fill="#EA4335"
            d="M12 4.77c1.76 0 3.35.6 4.6 1.78l3.45-3.45A11.9 11.9 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.95 3.12C6.2 6.9 8.86 4.77 12 4.77z"
          />
        </svg>
      </span>
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
