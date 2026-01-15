begin;

alter table public.club_verification_requests
  drop constraint if exists club_verification_requests_club_id_fkey;

alter table public.club_verification_requests
  add constraint club_verification_requests_club_id_fkey
  foreign key (club_id)
  references public.profiles(id)
  on delete cascade;

commit;
