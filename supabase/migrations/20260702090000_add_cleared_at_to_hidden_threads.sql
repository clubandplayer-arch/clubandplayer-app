alter table public.direct_message_hidden_threads
  add column if not exists cleared_at timestamptz;

create index if not exists idx_direct_message_hidden_threads_owner_other
  on public.direct_message_hidden_threads (owner_profile_id, other_profile_id);
