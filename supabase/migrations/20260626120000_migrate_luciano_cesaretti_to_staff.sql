-- Migrate Luciano Cesaretti from ENTE/institution to STAFF.
-- This keeps the account ready for the staff onboarding flow where the user
-- can complete the profile with the specific staff role (for example Presidente).

do $$
declare
  target_user_id uuid := '1db5adce-ad91-4424-b53b-3efb6ea9c5a9';
  target_email text := 'cesarettiluciano@gmail.com';
begin
  update public.profiles p
  set
    account_type = 'staff',
    type = 'staff',
    role = case
      when lower(coalesce(p.role, '')) in ('ente', 'institution') then null
      else p.role
    end,
    is_admin = false,
    updated_at = now()
  from auth.users u
  where p.user_id = u.id
    and u.id = target_user_id
    and lower(u.email) = target_email;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'staff',
        'type', 'staff',
        'role', 'staff'
      ),
    updated_at = now()
  where id = target_user_id
    and lower(email) = target_email;
end $$;
