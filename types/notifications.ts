export type NotificationKind = 'new_follower' | 'new_message' | 'new_opportunity' | 'system';

export type NotificationRow = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  kind: NotificationKind | string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  read?: boolean | null;
  actor_profile_id: string | null;
  recipient_profile_id?: string | null;
};

export type NotificationWithActor = NotificationRow & {
  actor?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    account_type: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
};
