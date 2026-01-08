begin;

update public.profiles
set sport = 'Volley'
where sport = 'Pallavolo';

update public.opportunities
set sport = 'Volley'
where sport = 'Pallavolo';

commit;
