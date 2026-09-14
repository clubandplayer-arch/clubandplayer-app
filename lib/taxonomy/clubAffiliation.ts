import type { CanonicalSportFormValue as CanonicalSportFilterValue } from '@/lib/taxonomy/canonicalSportFormPayload';

export type ClubAffiliationSelection = { countryId:string; sport:CanonicalSportFilterValue; organizationId:string; categoryId:string; organizationName?:string; categoryName?:string };
export const emptyClubAffiliation = ():ClubAffiliationSelection => ({countryId:'',sport:{sportId:'',disciplineId:'',variantId:'',legacySport:''},organizationId:'',categoryId:''});
export const changeClubCountry = (value:ClubAffiliationSelection, countryId=''):ClubAffiliationSelection => ({...emptyClubAffiliation(),countryId});
export const changeClubSport = (value:ClubAffiliationSelection, sport:CanonicalSportFilterValue):ClubAffiliationSelection => ({...value,sport,organizationId:'',categoryId:'',organizationName:'',categoryName:''});
export const changeClubOrganization = (value:ClubAffiliationSelection, organizationId:string, organizationName=''):ClubAffiliationSelection => ({...value,organizationId,organizationName,categoryId:'',categoryName:''});
export const changeClubCategory = (value:ClubAffiliationSelection, categoryId:string, categoryName=''):ClubAffiliationSelection => ({...value,categoryId,categoryName});

export type ClubAffiliationProfile = {
  club_country_id?:string|null; club_primary_organization_id?:string|null;
  club_organization_category_id?:string|null; club_league_category?:string|null;
  sport_id?:string|null; sport_discipline_id?:string|null; sport_variant_id?:string|null;
};
export const hydrateClubAffiliation = (profile:ClubAffiliationProfile,legacySport=''):ClubAffiliationSelection => ({
  countryId:profile.club_country_id??'',
  sport:{sportId:profile.sport_id??'',disciplineId:profile.sport_discipline_id??'',variantId:profile.sport_variant_id??'',legacySport},
  organizationId:profile.club_primary_organization_id??'',categoryId:profile.club_organization_category_id??'',
  categoryName:profile.club_league_category??'',
});
export const clubAffiliationPatch = (value:ClubAffiliationSelection,dirty:boolean) => {
  if (!dirty) return {};
  const complete=Boolean(value.countryId&&value.organizationId&&value.categoryId);
  return {clubAffiliation:{
    countryId:complete?value.countryId:null,organizationId:complete?value.organizationId:null,categoryId:complete?value.categoryId:null,
  }};
};
