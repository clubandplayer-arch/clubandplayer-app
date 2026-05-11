begin;

alter table if exists public.notifications
  drop constraint if exists notifications_actor_profile_id_fkey;

alter table if exists public.notifications
  add constraint notifications_actor_profile_id_fkey
  foreign key (actor_profile_id)
  references public.profiles(id)
  on delete set null;

alter table if exists public.notifications
  drop constraint if exists notifications_recipient_profile_id_fkey;

alter table if exists public.notifications
  add constraint notifications_recipient_profile_id_fkey
  foreign key (recipient_profile_id)
  references public.profiles(id)
  on delete set null;

commit;
