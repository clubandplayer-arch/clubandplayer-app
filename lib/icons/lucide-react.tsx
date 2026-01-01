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
