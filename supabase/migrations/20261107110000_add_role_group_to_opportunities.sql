-- PR2: add retrocompatible role_group to opportunities

alter table if exists public.opportunities
  add column if not exists role_group text;

update public.opportunities
set role_group = 'player'
where role_group is null;

alter table public.opportunities
  drop constraint if exists opportunities_role_group_check;

alter table public.opportunities
  add constraint opportunities_role_group_check
  check (role_group in ('player', 'staff'));
