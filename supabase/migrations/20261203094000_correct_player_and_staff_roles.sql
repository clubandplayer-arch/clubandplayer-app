-- Data fix: correct two profiles that selected the wrong account type.
do $$
declare
  john_apple_id uuid := 'e4bcfe31-97af-494a-92e0-ffdaa31d6cf9';
  modou_id uuid := 'd6d30031-600e-456f-8664-db7704f9a8d1';
begin
  update public.profiles
  set
    account_type = 'athlete',
    type = 'athlete',
    role = case
      when lower(coalesce(role, '')) in ('club', 'societa', 'società', 'team', 'staff') then null
      else role
    end,
    is_admin = false,
    updated_at = now()
  where id = john_apple_id;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'athlete',
        'type', 'athlete',
        'role', 'athlete'
      ),
    updated_at = now()
  where id = john_apple_id;

  update public.profiles
  set
    account_type = 'staff',
    type = 'staff',
    role = case
      when lower(coalesce(role, '')) in ('club', 'societa', 'società', 'team', 'athlete', 'player') then null
      else role
    end,
    is_admin = false,
    updated_at = now()
  where id = modou_id;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'staff',
        'type', 'staff',
        'role', 'staff'
      ),
    updated_at = now()
  where id = modou_id;
end $$;
