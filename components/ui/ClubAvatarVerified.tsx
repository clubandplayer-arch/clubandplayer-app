/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';

import VerifiedBadge from '@/components/ui/VerifiedBadge';

type ClubAvatarVerifiedProps = {
  src?: string | null;
  alt: string;
  sizeClass: string;
  isVerified?: boolean | null;
  badgeSize?: 'sm' | 'md' | 'lg';
  badgeVariant?: 'feed' | 'profile' | 'list';
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
  badgeVariant = 'list',
  className = '',
  imageClassName = '',
  fallback = null,
}: ClubAvatarVerifiedProps) {
  const debugAttributes =
    process.env.NODE_ENV !== 'production'
      ? { 'data-verified': isVerified ? '1' : '0', 'data-debug-id': alt }
      : {};
  const positionClass =
    badgeVariant === 'list'
      ? 'absolute -top-0.5 -right-0.5 z-10 translate-x-1/2 -translate-y-1/2'
      : 'absolute -top-1 -right-1 z-10 translate-x-1/2 -translate-y-1/2';
  return (
    <div className={`relative overflow-visible ${sizeClass} ${className}`} {...debugAttributes}>
      {src ? (
        <img src={src} alt={alt} className={`h-full w-full rounded-full object-cover ${imageClassName}`} />
      ) : (
        fallback
      )}
      {isVerified ? (
        <span className={`${positionClass} rounded-full`}>
          <VerifiedBadge size={badgeSize} />
        </span>
      ) : null}
    </div>
  );
}
