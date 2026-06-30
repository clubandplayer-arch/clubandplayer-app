-- Data fix: convert the club profile created as "Simone Finassi" into
-- Polisportiva Bergamo and pin it to Oratorio San Francesco in Bergamo.
update public.profiles
set
  full_name = 'Polisportiva Bergamo',
  display_name = 'Polisportiva Bergamo',
  city = 'Bergamo',
  province = 'BG',
  region = 'Lombardia',
  country = 'IT',
  club_stadium = 'Oratorio San Francesco',
  club_stadium_address = 'Viale Venezia, 29, 24125 Bergamo BG',
  latitude = 45.6959797,
  longitude = 9.6949955,
  club_stadium_lat = 45.6959797,
  club_stadium_lng = 9.6949955,
  updated_at = now()
where id = '0249c05d-dd31-41ec-b97c-1ed47ec2437a'
  and (account_type = 'club' or type = 'club');
