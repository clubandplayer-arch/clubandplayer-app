import * as React from 'react';

function mergeClasses(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
}

export const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={mergeClasses('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  ),
);
Avatar.displayName = 'Avatar';

export const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, alt, ...props }, ref) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      className={mergeClasses('aspect-square h-full w-full object-cover', className)}
      alt={alt}
      {...props}
    />
  ),
);
AvatarImage.displayName = 'AvatarImage';

export const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={mergeClasses(
        'flex h-full w-full items-center justify-center rounded-full bg-neutral-100 text-neutral-600',
        className,
      )}
      {...props}
    />
  ),
);
AvatarFallback.displayName = 'AvatarFallback';
