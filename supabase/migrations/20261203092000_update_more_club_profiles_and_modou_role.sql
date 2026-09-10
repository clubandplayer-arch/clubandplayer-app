-- Data fixes for additional club profiles and one wrong role selection.
do $$
declare
  sport_communication_id uuid := 'ff98597e-2f98-461d-8d24-92011c70fc03';
  futsei_id uuid := 'b29b1ccf-fec5-4bbf-9105-cf9835bb237b';
  modou_id uuid := 'd6d30031-600e-456f-8664-db7704f9a8d1';
  sport_communication_name text := 'Polisportiva Sport Communication A.S.D.';
  futsei_name text := 'ASD Futsei Milano';
begin
  update public.profiles
  set
    full_name = sport_communication_name,
    display_name = sport_communication_name,
    city = 'Civitanova Marche',
    province = 'MC',
    region = 'Marche',
    country = 'IT',
    club_stadium = 'Polisportiva Sport Communication A.S.D.',
    club_stadium_address = 'Via Roma, 64, 62012 Civitanova Marche MC',
    latitude = 43.3172815,
    longitude = 13.679592,
    club_stadium_lat = 43.3172815,
    club_stadium_lng = 13.679592,
    updated_at = now()
  where id = sport_communication_id
    and (account_type = 'club' or type = 'club');

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'full_name', sport_communication_name,
        'display_name', sport_communication_name,
        'name', sport_communication_name
      ),
    updated_at = now()
  where id = sport_communication_id;

  update public.profiles
  set
    full_name = futsei_name,
    display_name = futsei_name,
    city = 'Milano',
    province = 'MI',
    region = 'Lombardia',
    country = 'IT',
    club_stadium = 'ASD Futsei Milano',
    club_stadium_address = 'Via Luigi Mengoni, 5; Via Muggiano, 14; Via Pisa, 1; Via Valdagno, 8, 20147 Milano MI',
    latitude = 45.4611425,
    longitude = 9.1125631,
    club_stadium_lat = 45.4611425,
    club_stadium_lng = 9.1125631,
    updated_at = now()
  where id = futsei_id
    and (account_type = 'club' or type = 'club');

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'full_name', futsei_name,
        'display_name', futsei_name,
        'name', futsei_name
      ),
    updated_at = now()
  where id = futsei_id;

  update public.profiles
  set
    account_type = 'athlete',
    type = 'athlete',
    role = case
      when lower(coalesce(role, '')) in ('club', 'societa', 'società', 'team') then null
      else role
    end,
    is_admin = false,
    updated_at = now()
  where id = modou_id;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'athlete',
        'type', 'athlete',
        'role', 'athlete'
      ),
    updated_at = now()
  where id = modou_id;
end $$;
