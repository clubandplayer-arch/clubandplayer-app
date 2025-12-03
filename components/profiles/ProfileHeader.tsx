'use client';

import Image from 'next/image';

import FollowButton from '@/components/clubs/FollowButton';
import { MessageButton } from '@/components/messaging/MessageButton';

type AccountType = 'club' | 'athlete' | 'player';

type ProfileHeaderProps = {
  profileId: string;
  displayName: string;
  accountType: AccountType;
  avatarUrl?: string | null;
  subtitle?: string | null;
  locationLabel?: string | null;
  showMessageButton?: boolean;
  showFollowButton?: boolean;
  messageLabel?: string;
};

function initialsFromName(name: string, accountType: AccountType) {
  const safeName = (name || '').trim();
  if (!safeName) return accountType === 'club' ? 'CL' : 'PL';
  const parts = safeName
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ProfileHeader({
  profileId,
  displayName,
  accountType,
  avatarUrl,
  subtitle,
  locationLabel,
  showMessageButton = true,
  showFollowButton = true,
  messageLabel = 'Messaggia',
}: ProfileHeaderProps) {
  const name = displayName || (accountType === 'club' ? 'Club' : 'Player');
  const initials = initialsFromName(name, accountType);
  const subtitleText = subtitle?.trim();
  const locationText = locationLabel?.trim();

  return (
    <header className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-transparent ring-1 ring-white/60 shadow-sm md:h-32 md:w-32">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} fill sizes="128px" className="rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-neutral-50 to-neutral-200 text-xl font-semibold text-neutral-600">
              {initials}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold leading-tight text-neutral-900 md:text-3xl">{name}</h1>
              {subtitleText ? (
                <p className="text-sm font-medium text-neutral-700 md:text-base">{subtitleText}</p>
              ) : null}
            </div>
            {locationText ? (
              <p className="text-xs text-neutral-500">{locationText}</p>
            ) : (
              <p className="text-xs text-neutral-400">Località —</p>
            )}
          </div>

          {(showMessageButton || showFollowButton) && (
            <div className="flex items-start justify-end gap-2">
              {showMessageButton ? (
                <MessageButton
                  targetProfileId={profileId}
                  label={messageLabel}
                  className="border-neutral-200 bg-white hover:bg-neutral-50"
                />
              ) : null}
              {showFollowButton ? (
                <FollowButton
                  targetProfileId={profileId}
                  labelFollow="Segui"
                  labelFollowing="Seguo"
                  size="md"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
