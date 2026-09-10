-- Migrate Alessandro D'Ambrosi from CLUB to PLAYER (athlete).
-- The user selected the wrong account type during signup; keep the profile ready
-- for the player onboarding flow so he can complete the remaining fields later.

DO $$
DECLARE
  target_user_id uuid := '0c3e325b-1fbc-4be9-8325-dea490cf05ae';
  target_full_name text := 'Alessandro D''Ambrosi';
BEGIN
  UPDATE public.profiles p
  SET
    account_type = 'athlete',
    type = 'athlete',
    full_name = target_full_name,
    display_name = target_full_name,
    role = CASE
      WHEN lower(coalesce(p.role, '')) IN ('club', 'societa', 'società', 'team') THEN NULL
      ELSE p.role
    END,
    is_admin = false,
    updated_at = now()
  WHERE p.user_id = target_user_id;

  UPDATE auth.users
  SET
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'athlete',
        'type', 'athlete',
        'role', 'athlete',
        'full_name', target_full_name,
        'display_name', target_full_name,
        'name', target_full_name
      ),
    updated_at = now()
  WHERE id = target_user_id;
END $$;
