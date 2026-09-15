begin;

-- Replay bridge for two historical migrations that used different reaction
-- column names. Production objects are left intact; no data is backfilled.
alter table public.post_reactions
  add column if not exists reaction text
  check (reaction in ('like', 'love', 'care', 'angry'));

commit;
