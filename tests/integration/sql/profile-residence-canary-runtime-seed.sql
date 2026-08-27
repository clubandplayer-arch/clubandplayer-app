\set ON_ERROR_STOP on

-- Synthetic runtime-only memberships. Production IDs are never stored here.
insert into public.profile_residence_write_canary_users(user_id) values
  ('40000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000005');
