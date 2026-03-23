'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import FollowButton from '@/components/clubs/FollowButton';
import { MessageButton } from '@/components/messaging/MessageButton';
import CertifiedCMarkClubProfile from '@/components/badges/CertifiedCMarkClubProfile';
import type { ProfileLinks } from '@/types/profile';

type AccountType = 'club' | 'athlete' | 'player';

type ProfileHeaderProps = {
  profileId: string;
  displayName: string;
  accountType: AccountType;
  avatarUrl?: string | null;
  subtitle?: string | null;
  locationLabel?: string | null;
  locationContent?: ReactNode;
  socialLinks?: ProfileLinks;
  showMessageButton?: boolean;
  showFollowButton?: boolean;
  messageLabel?: string;
  isVerified?: boolean | null;
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

function SocialIconButton({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white transition hover:bg-neutral-50 ${className}`}
    >
      {children}
    </a>
  );
}

function ProfileSocialLinks({ socialLinks }: { socialLinks?: ProfileLinks }) {
  const items = [
    socialLinks?.instagram
      ? {
          key: 'instagram',
          href: socialLinks.instagram,
          label: 'Instagram',
          className: 'border-[#E1306C]/30 text-[#E1306C]',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9zm4.5-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>,
        }
      : null,
    socialLinks?.facebook
      ? {
          key: 'facebook',
          href: socialLinks.facebook,
          label: 'Facebook',
          className: 'border-[#1877F2]/30 text-[#1877F2]',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.4V12h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z"/></svg>,
        }
      : null,
    socialLinks?.tiktok
      ? {
          key: 'tiktok',
          href: socialLinks.tiktok,
          label: 'TikTok',
          className: 'border-black/20 text-black',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.6 2.2 2.2 4 4.3 4.7V11a8.3 8.3 0 0 1-4.3-1.3v6.1a5.9 5.9 0 1 1-5.9-5.9c.5 0 1 .1 1.5.2v2.7a3.2 3.2 0 1 0 2.2 3V3h2.2z"/></svg>,
        }
      : null,
    socialLinks?.x
      ? {
          key: 'x',
          href: socialLinks.x,
          label: 'X',
          className: 'border-black/20 text-black',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h4.6l4.1 5.8L16.8 3H21l-7.2 9.1L21.5 21h-4.6l-4.6-6.4L7.2 21H3l7.6-9.6L3 3z"/></svg>,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    href: string;
    label: string;
    className: string;
    icon: ReactNode;
  }>;

  if (!items.length) return null;

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Social</span>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {items.map((item) => (
          <SocialIconButton
            key={item.key}
            href={item.href}
            label={item.label}
            className={item.className}
          >
            {item.icon}
          </SocialIconButton>
        ))}
      </div>
    </div>
  );
}

export default function ProfileHeader({
  profileId,
  displayName,
  accountType,
  avatarUrl,
  subtitle,
  locationLabel,
  locationContent,
  socialLinks,
  showMessageButton = true,
  showFollowButton = true,
  messageLabel = 'Messaggia',
  isVerified = null,
}: ProfileHeaderProps) {
  const name = displayName || (accountType === 'club' ? 'Club' : 'Player');
  const initials = initialsFromName(name, accountType);
  const subtitleText = subtitle?.trim();
  const locationText = locationLabel?.trim();
  const isClub = accountType === 'club';
  const badgeLabel = isClub ? 'Club' : 'Giocatore';
  const hasActions = showMessageButton || showFollowButton;

  return (
    <header className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="relative h-28 w-28 shrink-0 md:h-32 md:w-32">
          <div className="h-full w-full overflow-hidden rounded-full bg-transparent ring-1 ring-white/60">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={name} fill sizes="128px" className="rounded-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-neutral-50 to-neutral-200 text-xl font-semibold text-neutral-600">
                {initials}
              </div>
            )}
          </div>
          {isClub && isVerified ? <CertifiedCMarkClubProfile className="absolute -top-2 -right-2" /> : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-logo text-2xl font-normal leading-tight text-neutral-900 md:text-3xl">{name}</h1>
              <span
                className={`${
                  isClub
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200'
                } inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-tight`}
              >
                {badgeLabel}
              </span>
            </div>
            {subtitleText ? (
              <p className="text-sm font-medium text-neutral-700 md:text-base">{subtitleText}</p>
            ) : null}
            {locationContent ? (
              <div className="text-xs text-neutral-500">{locationContent}</div>
            ) : locationText ? (
              <p className="text-xs text-neutral-500">{locationText}</p>
            ) : (
              <p className="text-xs text-neutral-400">Località —</p>
            )}
          </div>

          {(socialLinks || hasActions) && (
            <div className="flex w-full flex-col items-start gap-3 md:w-auto md:items-end">
              <ProfileSocialLinks socialLinks={socialLinks} />
              {hasActions && (
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
          )}
        </div>
      </div>
    </header>
  );
}
