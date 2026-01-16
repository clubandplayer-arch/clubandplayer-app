/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';

import VerifiedBadge from '@/components/ui/VerifiedBadge';

type ClubAvatarVerifiedProps = {
  src?: string | null;
  alt: string;
  sizeClass: string;
  isVerified?: boolean | null;
  badgeSize?: 'sm' | 'md' | 'lg';
  badgePosition?: 'inside' | 'outside';
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
  badgePosition = 'outside',
  className = '',
  imageClassName = '',
  fallback = null,
}: ClubAvatarVerifiedProps) {
  const debugAttributes =
    process.env.NODE_ENV !== 'production'
      ? { 'data-verified': isVerified ? '1' : '0', 'data-debug-id': alt }
      : {};
  const positionClass =
    badgePosition === 'inside'
      ? 'absolute top-0 right-0 z-10'
      : 'absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 z-10';
  return (
    <div className={`relative overflow-visible ${sizeClass} ${className}`} {...debugAttributes}>
      {src ? (
        <img src={src} alt={alt} className={`h-full w-full rounded-full object-cover ${imageClassName}`} />
      ) : (
        fallback
      )}
      {isVerified ? (
        <span className={`${positionClass} rounded-full shadow-sm`}>
          <VerifiedBadge size={badgeSize} />
        </span>
      ) : null}
    </div>
  );
}
