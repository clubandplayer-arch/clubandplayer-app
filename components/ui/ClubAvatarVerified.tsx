/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';

import VerifiedBadge from '@/components/ui/VerifiedBadge';

type ClubAvatarVerifiedProps = {
  src?: string | null;
  alt: string;
  sizeClass: string;
  isVerified?: boolean | null;
  badgeSize?: 'sm' | 'md' | 'lg';
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
};

export default function ClubAvatarVerified({
  src,
  alt,
  sizeClass,
  isVerified = false,
  badgeSize = 'md',
  className = '',
  imageClassName = '',
  fallback = null,
}: ClubAvatarVerifiedProps) {
  const debugAttributes =
    process.env.NODE_ENV !== 'production'
      ? { 'data-verified': isVerified ? '1' : '0', 'data-debug-id': alt }
      : {};
  return (
    <div className={`relative overflow-visible ${sizeClass} ${className}`} {...debugAttributes}>
      {src ? (
        <img src={src} alt={alt} className={`h-full w-full rounded-full object-cover ${imageClassName}`} />
      ) : (
        fallback
      )}
      {isVerified ? (
        <span className="absolute top-1 right-1 z-10 rounded-full ring-2 ring-white shadow-sm">
          <VerifiedBadge size={badgeSize} />
        </span>
      ) : null}
    </div>
  );
}
