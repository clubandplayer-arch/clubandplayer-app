'use client';

import type { MouseEventHandler } from 'react';

const defaultLabel = 'Continua con Apple';

type AppleAuthButtonProps = {
  label?: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

export default function AppleAuthButton({
  label = defaultLabel,
  onClick,
  disabled,
}: AppleAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-start gap-3 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 hover:bg-slate-50 disabled:opacity-60"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white">
        <svg className="h-6 w-6" width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M16.68 12.57c.02 2.52 2.2 3.36 2.22 3.37-.02.06-.35 1.2-1.16 2.37-.7 1.01-1.43 2.02-2.58 2.04-1.13.02-1.49-.66-2.78-.66-1.3 0-1.69.64-2.76.68-1.12.04-1.97-1.12-2.68-2.12-1.45-2.09-2.56-5.9-1.07-8.47.74-1.28 2.06-2.08 3.49-2.1 1.09-.02 2.12.71 2.78.71.66 0 1.9-.88 3.2-.75.54.02 2.07.22 3.05 1.67-.08.05-1.82 1.06-1.8 3.26z"
          />
          <path
            fill="currentColor"
            d="M14.47 4.22c.59-.71 1-1.7.89-2.7-.85.03-1.88.57-2.49 1.28-.55.64-1.03 1.67-.9 2.65.95.07 1.9-.48 2.5-1.23z"
          />
        </svg>
      </span>
      <span className="h-6 w-px bg-slate-200" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
