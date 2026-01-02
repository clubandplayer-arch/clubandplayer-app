import * as React from 'react';

export type LucideProps = React.SVGProps<SVGSVGElement> & {
  color?: string;
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};

export const Users = React.forwardRef<SVGSVGElement, LucideProps>(function Users(
  { color = 'currentColor', size = 24, strokeWidth = 2, absoluteStrokeWidth = false, ...props },
  ref,
) {
  const computedStrokeWidth =
    absoluteStrokeWidth && typeof size === 'number'
      ? (Number(strokeWidth) * 24) / size
      : strokeWidth;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={computedStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
});

export const Search = React.forwardRef<SVGSVGElement, LucideProps>(function Search(
  { color = 'currentColor', size = 24, strokeWidth = 2, absoluteStrokeWidth = false, ...props },
  ref,
) {
  const computedStrokeWidth =
    absoluteStrokeWidth && typeof size === 'number'
      ? (Number(strokeWidth) * 24) / size
      : strokeWidth;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={computedStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
});

export const LogOut = React.forwardRef<SVGSVGElement, LucideProps>(function LogOut(
  { color = 'currentColor', size = 24, strokeWidth = 2, absoluteStrokeWidth = false, ...props },
  ref,
) {
  const computedStrokeWidth =
    absoluteStrokeWidth && typeof size === 'number'
      ? (Number(strokeWidth) * 24) / size
      : strokeWidth;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={computedStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
});

export const Plus = React.forwardRef<SVGSVGElement, LucideProps>(function Plus(
  { color = 'currentColor', size = 24, strokeWidth = 2, absoluteStrokeWidth = false, ...props },
  ref,
) {
  const computedStrokeWidth =
    absoluteStrokeWidth && typeof size === 'number'
      ? (Number(strokeWidth) * 24) / size
      : strokeWidth;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={computedStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
});
