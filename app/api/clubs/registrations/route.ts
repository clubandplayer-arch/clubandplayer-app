import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { NextResponse } from 'next/server';
import { validateOrganizationMembership, OrganizationMembershipError } from '@/lib/sports/organizationMembership.server';
const errorJson=(message:string,status:number)=>NextResponse.json({error:message},{status});

async function clubProfile(supabase:any,userId:string){return (await supabase.from('profiles').select('id').eq('user_id',userId).eq('account_type','club').single()).data;}
export const GET=withAuth(async(_req,{supabase,user})=>{const club=await clubProfile(supabase,user.id);if(!club)return errorJson('club_only',403);const {data,error}=await supabase.from('club_sport_registrations').select('*,sports:sport_id(canonical_name),organization:sports_organization_id(code,canonical_name),category:sports_organization_category_id(canonical_name)').eq('club_profile_id',club.id).eq('is_active',true).order('is_primary',{ascending:false}).order('created_at');return error?errorJson(error.message,400):NextResponse.json({data:data??[]});});
export const POST=withAuth(async(req:NextRequest,{supabase,user})=>{const club=await clubProfile(supabase,user.id);if(!club)return errorJson('club_only',403);const b=await req.json();try{await validateOrganizationMembership(supabase,{organizationId:b.sports_organization_id,categoryId:b.sports_organization_category_id,sportId:b.sport_id,disciplineId:b.sport_discipline_id??null,variantId:b.sport_variant_id??null});}catch(e){return errorJson(e instanceof OrganizationMembershipError?e.code:'invalid_registration',400);}const {data,error}=await supabase.from('club_sport_registrations').insert({...b,club_profile_id:club.id}).select('*').single();return error?errorJson(error.message,400):NextResponse.json({data});});
