const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type ClubAffiliationInput={countryId:string|null;organizationId:string|null;categoryId:string|null};
export type ClubAffiliationScope={sportId:string|null;disciplineId:string|null;variantId:string|null};
export type ClubAffiliationRow={id:string;organization_id:string;country_id:string;sport_id:string;discipline_id:string|null;variant_id:string|null;canonical_name:string;is_active:boolean};
export type ClubAffiliationOrganizationRow={id:string;is_active:boolean;valid_from:string|null;valid_to:string|null};
export type ClubAffiliationSource={category(input:Required<ClubAffiliationInput>):Promise<ClubAffiliationRow|null>;organization(id:string):Promise<ClubAffiliationOrganizationRow|null>;countryIso2(id:string):Promise<string|null>};
export function isOrganizationActiveOn(row:ClubAffiliationOrganizationRow|null,asOf:string){
 return Boolean(row?.is_active&&(!row.valid_from||row.valid_from<=asOf)&&(!row.valid_to||row.valid_to>=asOf));
}
export function parseClubAffiliation(raw:unknown):ClubAffiliationInput|null {
 if(!raw||typeof raw!=='object')return null; const x=raw as Record<string,unknown>;
 const val=(key:string)=>typeof x[key]==='string'&&x[key].trim()?x[key].trim():null;
 const result={countryId:val('countryId'),organizationId:val('organizationId'),categoryId:val('categoryId')};
 const values=Object.values(result); if(values.some(Boolean)&&values.some(v=>!v))return null;
 if(values.some(Boolean)&&values.some(v=>!UUID.test(v!)))return null; return result;
}
export async function validateClubAffiliation(source:ClubAffiliationSource,input:ClubAffiliationInput,scope:ClubAffiliationScope,asOf=new Date().toISOString().slice(0,10)){
 if(!input.countryId&&!input.organizationId&&!input.categoryId)return {clear:true as const};
 const required={countryId:input.countryId!,organizationId:input.organizationId!,categoryId:input.categoryId!}; const row=await source.category(required);
 if(!row||!row.is_active||row.sport_id!==scope.sportId||row.discipline_id!==(scope.disciplineId??null)||row.variant_id!==(scope.variantId??null))return null;
 const [organization,countryIso2]=await Promise.all([source.organization(required.organizationId),source.countryIso2(required.countryId)]);
 if(!isOrganizationActiveOn(organization,asOf)||!countryIso2)return null;
 return {clear:false as const,countryId:required.countryId,organizationId:required.organizationId,categoryId:required.categoryId,countryIso2,categoryName:row.canonical_name};
}
