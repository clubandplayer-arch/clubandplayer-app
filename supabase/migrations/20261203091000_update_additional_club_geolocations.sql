-- Data fixes for club profiles that need curated names and map pins.
update public.profiles
set
  full_name = 'A.S.D. Azzurra Oratorio Albiate',
  display_name = 'A.S.D. Azzurra Oratorio Albiate',
  city = 'Albiate',
  province = 'MB',
  region = 'Lombardia',
  country = 'IT',
  club_stadium = 'Oratorio Centro Sportivo Paolo VI',
  club_stadium_address = 'Via Cesare Battisti, 60, 20847 Albiate MB',
  latitude = 45.6540703,
  longitude = 9.2438617,
  club_stadium_lat = 45.6540703,
  club_stadium_lng = 9.2438617,
  updated_at = now()
where id = '03339306-a5d5-4445-b920-da3cd13ab255'
  and (account_type = 'club' or type = 'club');

update public.profiles
set
  city = 'Bracca',
  province = 'BG',
  region = 'Lombardia',
  country = 'IT',
  club_stadium = 'Campo di Calcio "Centro Sportivo Adriano Frigeni"',
  club_stadium_address = 'Via Centro, 24010 Bracca BG',
  latitude = 45.8240294,
  longitude = 9.7079337,
  club_stadium_lat = 45.8240294,
  club_stadium_lng = 9.7079337,
  updated_at = now()
where id = '7451b699-c2ee-460c-8871-aa6f355b5326'
  and (account_type = 'club' or type = 'club');
