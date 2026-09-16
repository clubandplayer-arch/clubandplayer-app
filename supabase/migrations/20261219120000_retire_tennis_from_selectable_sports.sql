begin;

-- Tennis was exposed by the first five-country catalogue revision but is not
-- part of the application's supported team-sport vocabulary. Keep historical
-- UUID references readable while removing it from every active selector.
update public.legacy_sport_mappings
set is_active=false
where normalized_source_value='tennis';

update public.sports_organization_categories c
set is_active=false,updated_at=now()
from public.sports s
where c.sport_id=s.id and s.code='tennis';

update public.sports
set is_active=false,updated_at=now()
where code='tennis';

commit;
