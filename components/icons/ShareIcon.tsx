import type { SVGProps } from 'react';

export default function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M14 9l7-7m0 0v6m0-6h-6" />
      <path d="M5 15a7 7 0 0111-6.32M19 10v10a1 1 0 01-1 1H6a1 1 0 01-1-1V11" />
    </svg>
  );
}
