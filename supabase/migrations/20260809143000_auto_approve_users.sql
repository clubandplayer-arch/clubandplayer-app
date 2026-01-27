begin;

alter table public.profiles
  alter column status set default 'active';

update public.profiles
set status = 'active'
where status = 'pending';

commit;
