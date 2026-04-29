create table if not exists public.grouped_push_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('new_comment', 'new_reaction')),
  post_id text not null,
  latest_notification_id uuid not null references public.notifications(id) on delete cascade,
  group_count integer not null default 1 check (group_count > 0),
  actors text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null,
  sent_at timestamptz null,
  locked_at timestamptz null,
  last_result jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists grouped_push_queue_open_unique
on public.grouped_push_queue (recipient_user_id, kind, post_id)
where sent_at is null;

create index if not exists grouped_push_queue_flush_idx
on public.grouped_push_queue (scheduled_at)
where sent_at is null;

create or replace function public.touch_grouped_push_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists grouped_push_queue_touch_updated_at on public.grouped_push_queue;
create trigger grouped_push_queue_touch_updated_at
before update on public.grouped_push_queue
for each row execute function public.touch_grouped_push_queue_updated_at();
