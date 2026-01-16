/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';

import VerifiedBadge from '@/components/ui/VerifiedBadge';

type ClubAvatarVerifiedProps = {
  src?: string | null;
  alt: string;
  sizeClass: string;
  isVerified?: boolean | null;
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
};

export default function ClubAvatarVerified({
  src,
  alt,
  sizeClass,
  isVerified = false,
  className = '',
  imageClassName = '',
  fallback = null,
}: ClubAvatarVerifiedProps) {
  return (
    <div className={`relative overflow-visible ${sizeClass} ${className}`}>
      {src ? (
        <img src={src} alt={alt} className={`h-full w-full rounded-full object-cover ${imageClassName}`} />
      ) : (
        fallback
      )}
      {isVerified ? (
        <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 z-10">
          <VerifiedBadge size="sm" />
        </span>
      ) : null}
    </div>
  );
}
