-- Run after the full local migration replay.
do $$
begin
 if (select count(*) from public.sports_organizations where display_order between 1 and 12) <> 12 then raise exception 'organization catalog count'; end if;
 if exists(select 1 from public.sports_organization_categories where canonical_name ~* '^(Under 1[3-8]|Allievi|Juniores|Top Junior|Ragazzi|Minivolley|Supervolley|Minibasket|Micro)$') then raise exception 'unaggregated youth category'; end if;
 if exists(select organization_id,sport_id,discipline_id,variant_id from public.sports_organization_categories where canonical_name='Giovanili' group by 1,2,3,4 having count(*)>1) then raise exception 'duplicate Giovanili scope'; end if;
 if exists(select 1 from public.sports_organization_categories c join public.sports s on s.id=c.sport_id where s.code in ('handball','rugby','field_hockey','ice_hockey','baseball','softball','lacrosse') and c.provider='clubandplayer_authorized_catalog') then raise exception 'forbidden sport association'; end if;
 if exists(select club_profile_id from public.club_sport_registrations where is_active and is_primary group by club_profile_id having count(*)>1) then raise exception 'multiple primary registrations'; end if;
end $$;
