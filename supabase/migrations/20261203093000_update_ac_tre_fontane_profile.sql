-- Data fix: rename and geolocate the AC Tre Fontane club profile.
do $$
declare
  tre_fontane_id uuid := 'b4a83039-39cb-436c-ac5d-0ff78b87bbbd';
  tre_fontane_name text := 'S.S.D. AC Tre Fontane';
begin
  update public.profiles
  set
    full_name = tre_fontane_name,
    display_name = tre_fontane_name,
    city = 'Roma',
    province = 'RM',
    region = 'Lazio',
    country = 'IT',
    club_stadium = 'S.S.D. AC Tre Fontane',
    club_stadium_address = 'Via Costantino, 5, 00145 Roma RM',
    latitude = 41.8551606,
    longitude = 12.4895458,
    club_stadium_lat = 41.8551606,
    club_stadium_lng = 12.4895458,
    updated_at = now()
  where id = tre_fontane_id
    and (account_type = 'club' or type = 'club');

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'full_name', tre_fontane_name,
        'display_name', tre_fontane_name,
        'name', tre_fontane_name
      ),
    updated_at = now()
  where id = tre_fontane_id;
end $$;
