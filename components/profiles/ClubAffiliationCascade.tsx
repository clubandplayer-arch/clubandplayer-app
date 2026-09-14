'use client';

import { useEffect, useRef, useState } from 'react';
import CanonicalSportFilter, { type CanonicalSportFilterValue } from '@/components/sports/CanonicalSportFilter';
import { changeClubCategory, changeClubCountry, changeClubOrganization, changeClubSport } from '@/lib/taxonomy/clubAffiliation';

export type ClubAffiliationValue = {
  countryId: string;
  sport: CanonicalSportFilterValue;
  organizationId: string;
  categoryId: string;
  organizationName?: string;
  categoryName?: string;
};
type Country = { id:string; iso2:string };
type Organization = { id:string; code:string; officialName:string; organizationType:string };
type Category = { kind:'organization_category'; id:string; code:string; officialName:string };

export default function ClubAffiliationCascade({ countryIso2, value, onChange, t, sportLabel }: {
  countryIso2:string; value:ClubAffiliationValue; onChange:(value:ClubAffiliationValue)=>void;
  t:(key:any)=>string; sportLabel:(sport:any)=>string;
}) {
  const [countryId,setCountryId]=useState(value.countryId);
  const [countryState,setCountryState]=useState<'loading'|'idle'|'error'>('loading');
  const [organizations,setOrganizations]=useState<Organization[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [orgState,setOrgState]=useState<'idle'|'loading'|'error'>('idle');
  const [categoryState,setCategoryState]=useState<'idle'|'loading'|'error'>('idle');
  const valueRef=useRef(value);
  const onChangeRef=useRef(onChange);
  valueRef.current=value;
  onChangeRef.current=onChange;

  useEffect(()=>{ const controller=new AbortController();
    // Invalidate the previous country's requests synchronously, before lookup resolves.
    setCountryId(''); setCountryState('loading'); setOrganizations([]); setCategories([]);
    setOrgState('idle'); setCategoryState('idle');
    fetch('/api/geo/countries',{cache:'no-store',signal:controller.signal})
    .then(async r=>{const p=await r.json(); if(!r.ok) throw new Error(); const found=(p.data as Country[]).find(c=>c.iso2===countryIso2); const nextId=found?.id??''; setCountryId(nextId);setCountryState('idle');
      const current=valueRef.current;
      if (current.countryId && current.countryId !== nextId) onChangeRef.current(changeClubCountry(current,nextId));
      else if (!current.countryId && nextId) onChangeRef.current({...current,countryId:nextId});
    })
    .catch(e=>{if(e.name!=='AbortError'){setCountryId('');setCountryState('error');}}); return ()=>controller.abort();
  // Parent country changes alone trigger this lookup.
  },[countryIso2]);

  useEffect(()=>{
    // country/sport scope changes invalidate both dependent selectors.
    setOrganizations([]); setCategories([]);
    if(!countryId||!value.sport.sportId){setOrgState('idle');return;}
    const controller=new AbortController(); setOrgState('loading');
    const q=new URLSearchParams({countryId,sportId:value.sport.sportId,limit:'200'});
    if(value.sport.disciplineId)q.set('disciplineId',value.sport.disciplineId);
    if(value.sport.variantId)q.set('variantId',value.sport.variantId);
    fetch(`/api/taxonomy/sports-organizations?${q}`,{cache:'no-store',signal:controller.signal})
      .then(async r=>{const p=await r.json();if(!r.ok||!p.ok)throw new Error();setOrganizations(p.organizations);setOrgState('idle');})
      .catch(e=>{if(e.name!=='AbortError'){setOrgState('error');setOrganizations([]);}});
    return ()=>controller.abort();
  // IDs deliberately drive requests; names/locale never do.
  },[countryId,value.sport.sportId,value.sport.disciplineId,value.sport.variantId]);

  useEffect(()=>{
    setCategories([]); if(!countryId||!value.organizationId||!value.sport.sportId){setCategoryState('idle');return;}
    const controller=new AbortController(); setCategoryState('loading');
    const q=new URLSearchParams({countryId,sportId:value.sport.sportId,organizationId:value.organizationId,limit:'200'});
    if(value.sport.disciplineId)q.set('disciplineId',value.sport.disciplineId); if(value.sport.variantId)q.set('variantId',value.sport.variantId);
    fetch(`/api/taxonomy/competitive-options?${q}`,{cache:'no-store',signal:controller.signal})
      .then(async r=>{const p=await r.json();if(!r.ok||!p.ok)throw new Error();setCategories(p.options);setCategoryState('idle');})
      .catch(e=>{if(e.name!=='AbortError'){setCategoryState('error');setCategories([]);}});
    return ()=>controller.abort();
  },[countryId,value.organizationId,value.sport.sportId,value.sport.disciplineId,value.sport.variantId]);

  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <CanonicalSportFilter idPrefix="club-profile-sport" value={value.sport} sportLabel={sportLabel}
      onChange={sport=>onChange(changeClubSport(value,sport))}
      labels={{sport:t('profile.clubSport'),allSports:t('profile.select'),catalogUnavailable:t('sports.catalogUnavailable')}} />
    <label className="space-y-2 text-sm text-slate-700"><span className="font-medium">{t('club.primaryOrganization')}</span>
      <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3" value={value.organizationId}
        disabled={!countryId||!value.sport.sportId||orgState==='loading'||countryState==='loading'} onChange={e=>{const o=organizations.find(x=>x.id===e.target.value);onChange(changeClubOrganization({...value,countryId},e.target.value,o?.officialName??''));}}>
        <option value="">{countryState==='error'||orgState==='error'?t('club.affiliationLoadError'):countryState==='loading'||orgState==='loading'?t('common.loading'):organizations.length?t('profile.select'):t('club.noOrganizations')}</option>
        {organizations.map(o=><option key={o.id} value={o.id}>{o.officialName}</option>)}
      </select></label>
    <label className="space-y-2 text-sm text-slate-700"><span className="font-medium">{t('club.organizationCategory')}</span>
      <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3" value={value.categoryId}
        disabled={!value.organizationId||categoryState==='loading'} onChange={e=>{const c=categories.find(x=>x.id===e.target.value);onChange(changeClubCategory(value,e.target.value,c?.officialName??''));}}>
        <option value="">{categoryState==='loading'?t('common.loading'):categoryState==='error'?t('club.affiliationLoadError'):categories.length?t('profile.select'):t('club.noCategories')}</option>
        {categories.map(c=><option key={c.id} value={c.id}>{c.officialName}</option>)}
      </select></label>
  </div>;
}
