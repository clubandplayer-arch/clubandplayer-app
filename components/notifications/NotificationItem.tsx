'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { NotificationWithActor } from '@/types/notifications';

function Avatar({ notification }: { notification: NotificationWithActor }) {
  const src = notification.actor?.avatar_url
    ? notification.actor.avatar_url
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        notification.actor?.display_name || 'CP'
      )}`;
  return (
    <Image
      src={src}
      alt={notification.actor?.display_name || 'Utente'}
      width={40}
      height={40}
      className="h-10 w-10 flex-none rounded-full object-cover ring-1 ring-neutral-200"
    />
  );
}

type Props = {
  notification: NotificationWithActor;
  onClick?: () => void;
  compact?: boolean;
};

function renderContent(notification: NotificationWithActor) {
  const kind = (notification.kind || '').toString();
  const payload = notification.payload || {};
  const actorName = notification.actor?.display_name ?? 'Un utente';

  switch (kind) {
    case 'new_follower':
      return `${actorName} ha iniziato a seguirti`;
    case 'new_message':
      return `${actorName} ti ha inviato un messaggio`;
    case 'new_opportunity': {
      const title = typeof payload?.title === 'string' ? payload.title : 'nuova opportunità';
      return `${actorName || 'Un club'} ha pubblicato ${title}`;
    }
    default:
      return payload?.title ? String(payload.title) : 'Nuova notifica';
  }
}

function formatRelative(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function NotificationItem({ notification, onClick, compact }: Props) {
  const hrefFromPayload = () => {
    const payload = notification.payload || {};
    if (notification.kind === 'new_message' && typeof payload.conversation_id === 'string') {
      return `/messages?conversation=${payload.conversation_id}`;
    }
    if (notification.kind === 'new_follower' && typeof payload.follower_profile_id === 'string') {
      return `/profiles/${payload.follower_profile_id}`;
    }
    if (notification.kind === 'new_opportunity' && typeof payload.opportunity_id === 'string') {
      return `/opportunities/${payload.opportunity_id}`;
    }
    return '/notifications';
  };

  return (
    <Link
      href={hrefFromPayload()}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg border p-3 text-sm transition hover:bg-neutral-50 ${
        notification.read_at ? 'opacity-75' : 'bg-blue-50/40'
      } ${compact ? '!border-transparent' : ''}`}
    >
      {notification.actor ? <Avatar notification={notification} /> : null}
      <div className="flex-1 space-y-1">
        <div className="font-semibold text-neutral-800">{renderContent(notification)}</div>
        {notification.payload?.preview ? (
          <p className="text-neutral-600 line-clamp-2">{String(notification.payload.preview)}</p>
        ) : null}
        <div className="text-xs text-neutral-500">
          {formatRelative(notification.created_at)}
        </div>
      </div>
      {!notification.read_at && <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" aria-label="Non letta" />}
    </Link>
  );
}
