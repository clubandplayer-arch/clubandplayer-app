// components/profiles/ProfileEditForm.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import AvatarUploader from '@/components/profiles/AvatarUploader';
import ClubStadiumMapPicker from '@/components/profiles/ClubStadiumMapPicker';
import {
  LocationFallback,
  LocationFields,
  LocationSelection,
} from '@/components/profiles/LocationFields';
import { normalizeSport, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import { WORLD_COUNTRY_OPTIONS } from '@/lib/geo/countries';
import { ProfileSkill, type ProfileVisibilityStatus } from '@/types/profile';
import { getMissingRequiredProfileFields } from '@/lib/profiles/completion';
import { getProfileClubNameValidationError, sanitizeProfileClubName, sanitizeProfilePersonName } from '@/lib/profiles/nameValidation';
import { getProfileVisibilityStatusCopy, normalizeProfileVisibilityStatus } from '@/lib/profiles/publication';
import { CATEGORIES_BY_SPORT, CLUB_SPORT_OPTIONS, DEFAULT_CLUB_CATEGORIES } from '@/lib/opps/categories';
import { iso2ToFlagEmoji } from '@/lib/utils/flags';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  ensurePastExperienceCategory,
  getPastExperienceCategoriesBySport,
  getSeasonOptions,
  isPastExperienceComplete,
  isPastExperienceEmpty,
  sanitizePastExperience,
  type PastExperience,
} from '@/lib/profiles/pastExperiences';

type AccountType = 'club' | 'institution' | 'athlete' | 'staff' | 'fan' | null;

type Links = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
};

const EMPTY_PAST_EXPERIENCE: PastExperience = {
  season: '',
  club: '',
  sport: '',
  role: '',
  category: '',
};

const PLAYER_BIO_MAX_LENGTH = 300;
const PLAYER_BIO_WARNING_THRESHOLD = 20;

function RequiredMark() {
  return <span className="ml-1 font-semibold text-red-600" aria-hidden="true">*</span>;
}

const STAFF_ROLES = [
  'Presidente',
  'Vicepresidente',
  'Direttore Sportivo',
  'Direttore Generale',
  'Segretario',
  'Team Manager',
  'Dirigente Accompagnatore',
  'Allenatore',
  'Vice Allenatore',
  'Collaboratore Tecnico',
  'Match Analyst',
  'Video Analyst',
  'Preparatore Atletico',
  'Preparatore Portieri',
  'Medico Sociale',
  'Fisioterapista',
  'Osteopata',
  'Massaggiatore',
  'Mental Coach',
  'Nutrizionista',
  'Scout',
  'Talent Scout',
  'Addetto Stampa',
  'Social Media Manager',
  'Fotografo',
  'Content Creator',
] as const;

type Profile = {
  account_type: AccountType;
  profile_visibility_status: ProfileVisibilityStatus;
  club_name_review_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  club_name_review_reason: string | null;

  // anagrafica comune
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null; // ISO2 o testo
  region?: string | null;
  province?: string | null;
  skills: ProfileSkill[];

  // atleta
  birth_year: number | null;
  birth_place: string | null; // fallback (estero)
  city: string | null;        // residenza (estero)

  // residenza IT (atleta)
  residence_region_id: number | null;
  residence_province_id: number | null;
  residence_municipality_id: number | null;

  // nascita IT (atleta)
  birth_country: string | null; // ISO2 o testo
  birth_region_id: number | null;
  birth_province_id: number | null;
  birth_municipality_id: number | null;

  // interessi geo (comune)
  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;
  interest_city?: string | null;
  interest_region?: string | null;
  interest_province?: string | null;

  // atleta
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  sport: string | null;
  role: string | null;

  // club (nuovi)
  club_foundation_year: number | null;
  club_stadium: string | null;
  club_stadium_address: string | null;
  club_stadium_lat: number | null;
  club_stadium_lng: number | null;
  club_league_category: string | null;
  club_motto: string | null;

  // social / notifiche
  links: Links | null;
  notify_email_new_message: boolean;
};

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ---------- helpers ---------- */
function pickData<T = any>(raw: any): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as any).data as T;
  return raw as T;
}

function countryName(codeOrText?: string | null) {
  if (!codeOrText) return '';
  const v = codeOrText.trim();
  if (/^[A-Za-z]{2}$/.test(v)) {
    try {
      const dn = new Intl.DisplayNames(['it'], { type: 'region' });
      return dn.of(v.toUpperCase()) || v.toUpperCase();
    } catch {
      return v.toUpperCase();
    }
  }
  return v;
}

/** Normalizza una nazione in formato ISO2, se possibile */
function normalizeCountryCode(v?: string | null) {
  const s = (v || '').trim();
  if (!s) return null;
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();

  const aliases: Record<string, string> = {
    it: 'IT', italia: 'IT', italy: 'IT',
    francia: 'FR', france: 'FR',
    spagna: 'ES', spain: 'ES',
    germania: 'DE', germany: 'DE',
    portogallo: 'PT', portugal: 'PT',
    uk: 'GB', 'united kingdom': 'GB', 'regno unito': 'GB',
    usa: 'US', 'stati uniti': 'US', 'united states': 'US',
  };
  const key = s.toLowerCase();
  if (aliases[key]) return aliases[key];

  try {
    const codes: string[] = (Intl as any).supportedValuesOf?.('region') ?? [];
    const dnIt = new Intl.DisplayNames(['it'], { type: 'region' });
    const dnEn = new Intl.DisplayNames(['en'], { type: 'region' });
    for (const code of codes) {
      if (
        (dnIt.of(code) || '').toLowerCase() === key ||
        (dnEn.of(code) || '').toLowerCase() === key
      ) {
        return code.toUpperCase();
      }
    }
  } catch {}
  return s.toUpperCase();
}

/* ------------------------------ */

export default function ProfileEditForm() {
  const { t } = useI18n();
  const router = useRouter();

  // Profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const isClub = profile?.account_type === 'club';
  const isInstitution = profile?.account_type === 'institution';
  const isOrganization = isClub || isInstitution;
  const organizationLabel = isInstitution ? 'ente' : 'club';
  const organizationTitle = isInstitution ? 'Ente' : 'Club';
  const isFan = profile?.account_type === 'fan';
  const isStaff = profile?.account_type === 'staff';

  // Anagrafica base
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('IT');
  const [residenceCountry, setResidenceCountry] = useState('IT');

  // Atleta only
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [birthPlace, setBirthPlace] = useState('');

  // Nascita (atleta)
  const [birthCountry, setBirthCountry] = useState('IT');
  const [birthRegionId, setBirthRegionId] = useState<number | null>(null);
  const [birthProvinceId, setBirthProvinceId] = useState<number | null>(null);
  const [birthMunicipalityId, setBirthMunicipalityId] = useState<number | null>(null);

  // Location
  const [clubLocation, setClubLocation] = useState<LocationSelection>({
    regionId: null,
    provinceId: null,
    municipalityId: null,
    regionName: null,
    provinceName: null,
    cityName: null,
  });
  const [clubLocationFallback, setClubLocationFallback] = useState<LocationFallback>({});

  const [residenceLocation, setResidenceLocation] = useState<LocationSelection>({
    regionId: null,
    provinceId: null,
    municipalityId: null,
    regionName: null,
    provinceName: null,
    cityName: null,
  });
  const [residenceFallback, setResidenceFallback] = useState<LocationFallback>({});

  const [interestCountry, setInterestCountry] = useState('IT');
  const [interestLocation, setInterestLocation] = useState<LocationSelection>({
    regionId: null,
    provinceId: null,
    municipalityId: null,
    regionName: null,
    provinceName: null,
    cityName: null,
  });
  const [interestFallback, setInterestFallback] = useState<LocationFallback>({});

  // Atleta + notifiche
  const [foot, setFoot] = useState('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [athleteSport, setAthleteSport] = useState('Calcio');
  const [athleteRole, setAthleteRole] = useState('');
  const [pastExperiences, setPastExperiences] = useState<PastExperience[]>([{ ...EMPTY_PAST_EXPERIENCE }]);
  const [pastExperienceClubOptions, setPastExperienceClubOptions] = useState<string[]>([]);
  const [pastExperienceClubQuery, setPastExperienceClubQuery] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Social
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook]   = useState('');
  const [tiktok, setTiktok]       = useState('');
  const [x, setX]                 = useState('');

  // Club only
  const [sport, setSport] = useState('Calcio');
  const [clubCategory, setClubCategory] = useState('Altro');
  const [foundationYear, setFoundationYear] = useState<number | ''>('');
  const [stadium, setStadium] = useState('');
  const [stadiumAddress, setStadiumAddress] = useState('');
  const [stadiumLat, setStadiumLat] = useState<number | null>(null);
  const [stadiumLng, setStadiumLng] = useState<number | null>(null);
  const [clubMotto, setClubMotto] = useState('');

  // categorie dinamiche per sport
  const normalizedClubSport = normalizeSport(sport) ?? sport;
  const normalizedAthleteSport = normalizeSport(athleteSport) ?? athleteSport;
  const sportCategories = CATEGORIES_BY_SPORT[normalizedClubSport] ?? DEFAULT_CLUB_CATEGORIES;

  useEffect(() => {
    if (!sportCategories.includes(clubCategory)) {
      setClubCategory(sportCategories[0] ?? 'Altro');
    }
  }, [sport, sportCategories, clubCategory]);

  const athleteRoles = useMemo(() => {
    if (isStaff) return [...STAFF_ROLES];
    return SPORTS_ROLES[normalizedAthleteSport] ?? SPORTS_ROLES.Calcio ?? [];
  }, [isStaff, normalizedAthleteSport]);

  useEffect(() => {
    if (athleteRole && !athleteRoles.includes(athleteRole)) {
      setAthleteRole('');
    }
  }, [athleteRole, athleteRoles]);

  const seasonOptions = useMemo(() => getSeasonOptions(), []);

  async function loadPastExperiences() {
    const response = await fetch('/api/profiles/me/experiences', { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error('Impossibile leggere le esperienze passate');
    const raw = await response.json().catch(() => ({}));
    const list = Array.isArray(raw?.data) ? raw.data : [];
    const normalized = list
      .map((value: unknown) => ensurePastExperienceCategory(sanitizePastExperience((value || {}) as Record<string, unknown>)))
      .filter((item: PastExperience) => !isPastExperienceEmpty(item));
    setPastExperiences(normalized.length > 0 ? normalized : [{ ...EMPTY_PAST_EXPERIENCE }]);
  }

  async function loadProfile() {
    const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
    if (!r.ok) throw new Error('Impossibile leggere il profilo');
    const raw = await r.json().catch(() => ({}));
    const j = pickData<Partial<Profile>>(raw) || {};

    const p: Profile = {
      account_type: (j?.account_type ?? null) as AccountType,
      profile_visibility_status: normalizeProfileVisibilityStatus(j?.profile_visibility_status),
      club_name_review_status: (j?.club_name_review_status ?? 'not_required') as Profile['club_name_review_status'],
      club_name_review_reason: typeof j?.club_name_review_reason === 'string' ? j.club_name_review_reason : null,

      full_name: (j as any)?.full_name ?? null,
      avatar_url: (j as any)?.avatar_url ?? null,
      bio: (j as any)?.bio ?? null,
      country: (j as any)?.country ?? 'IT',
      region: (j as any)?.region ?? null,
      province: (j as any)?.province ?? null,
      skills: Array.isArray((j as any)?.skills) ? (j as any).skills : [],

      // atleta
      birth_year: (j as any)?.birth_year ?? null,
      birth_place: (j as any)?.birth_place ?? null,
      city: (j as any)?.city ?? null,

      residence_region_id: (j as any)?.residence_region_id ?? null,
      residence_province_id: (j as any)?.residence_province_id ?? null,
      residence_municipality_id: (j as any)?.residence_municipality_id ?? null,

      birth_country: (j as any)?.birth_country ?? 'IT',
      birth_region_id: (j as any)?.birth_region_id ?? null,
      birth_province_id: (j as any)?.birth_province_id ?? null,
      birth_municipality_id: (j as any)?.birth_municipality_id ?? null,

      interest_country: j?.interest_country ?? 'IT',
      interest_region_id: j?.interest_region_id ?? null,
      interest_province_id: j?.interest_province_id ?? null,
      interest_municipality_id: j?.interest_municipality_id ?? null,
      interest_city: (j as any)?.interest_city ?? null,
      interest_region: (j as any)?.interest_region ?? null,
      interest_province: (j as any)?.interest_province ?? null,

      foot: j?.foot ?? '',
      height_cm: j?.height_cm ?? null,
      weight_kg: j?.weight_kg ?? null,
      role: (j as any)?.role ?? null,

      // club
      sport: (j as any)?.sport ?? 'Calcio',
      club_foundation_year: (j as any)?.club_foundation_year ?? null,
      club_stadium: (j as any)?.club_stadium ?? null,
      club_stadium_address: (j as any)?.club_stadium_address ?? null,
      club_stadium_lat: (j as any)?.club_stadium_lat ?? null,
      club_stadium_lng: (j as any)?.club_stadium_lng ?? null,
      club_league_category: (j as any)?.club_league_category ?? null,
      club_motto: (j as any)?.club_motto ?? null,

      links: (j as any)?.links ?? null,
      notify_email_new_message: Boolean(j?.notify_email_new_message ?? true),
    };

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[ProfileEditForm] profile location', {
        country: p.country,
        region: p.region,
        province: p.province,
        city: p.city,
        interest_region: p.interest_region,
        interest_province: p.interest_province,
        interest_city: p.interest_city,
        interest_region_id: p.interest_region_id,
        interest_province_id: p.interest_province_id,
        interest_municipality_id: p.interest_municipality_id,
      });
    }

    setProfile(p);

    // init form fields (normalizzo a ISO2 per sicurezza)
    const loadedFullName = p.full_name || '';
    const sanitizedPersonFullName = sanitizeProfilePersonName(loadedFullName);
    const sanitizedClubFullName = sanitizeProfileClubName(loadedFullName);
    setFullName(
      (p.account_type === 'club' || p.account_type === 'institution')
        ? sanitizedClubFullName === loadedFullName
          ? sanitizedClubFullName
          : ''
        : p.account_type === 'athlete' || p.account_type === 'staff'
          ? sanitizedPersonFullName === loadedFullName
            ? sanitizedPersonFullName
            : ''
          : loadedFullName,
    );
    setAvatarUrl(p.avatar_url || null);
    setBio(p.bio || '');
    setCountry(normalizeCountryCode(p.country) || 'IT');
    setResidenceCountry(normalizeCountryCode(p.country) || 'IT');

    // atleta
    setBirthYear(p.birth_year ?? '');
    setBirthPlace(p.birth_place || '');

    setBirthCountry(normalizeCountryCode(p.birth_country) || 'IT');
    setBirthRegionId(p.birth_region_id);
    setBirthProvinceId(p.birth_province_id);
    setBirthMunicipalityId(p.birth_municipality_id);

    setClubLocation({
      regionId: p.interest_region_id ?? null,
      provinceId: p.interest_province_id ?? null,
      municipalityId: p.interest_municipality_id ?? null,
      regionName: p.interest_region || p.region || null,
      provinceName: p.interest_province || p.province || null,
      cityName: p.interest_city || p.city || null,
    });
    setClubLocationFallback({
      region: p.interest_region || p.region || null,
      province: p.interest_province || p.province || null,
      city: p.interest_city || p.city || null,
    });

    setResidenceLocation({
      regionId: p.residence_region_id,
      provinceId: p.residence_province_id,
      municipalityId: p.residence_municipality_id,
      regionName: null,
      provinceName: null,
      cityName: null,
    });
    setResidenceFallback({
      region: p.region ?? null,
      province: p.province ?? null,
      city: p.city ?? null,
    });

    setInterestCountry(p.interest_country || 'IT');
    setInterestLocation({
      regionId: p.interest_region_id,
      provinceId: p.interest_province_id,
      municipalityId: p.interest_municipality_id,
      regionName: p.interest_region || null,
      provinceName: p.interest_province || null,
      cityName: p.interest_city || null,
    });
    setInterestFallback({
      region: p.interest_region || p.region || null,
      province: p.interest_province || p.province || null,
      city: p.interest_city || p.city || null,
    });

    setFoot(p.foot || '');
    setHeightCm(p.height_cm ?? '');
    setWeightKg(p.weight_kg ?? '');
    setAthleteSport(normalizeSport(p.sport) || 'Calcio');
    setAthleteRole(p.role || '');
    setNotifyEmail(Boolean(p.notify_email_new_message));

    setInstagram(p.links?.instagram || '');
    setFacebook(p.links?.facebook || '');
    setTiktok(p.links?.tiktok || '');
    setX(p.links?.x || '');
    // club
    setSport(normalizeSport(p.sport) || 'Calcio');
    setClubCategory(p.club_league_category || 'Altro');
    setFoundationYear(p.club_foundation_year ?? '');
    setStadium(p.club_stadium || '');
    setStadiumAddress(p.club_stadium_address || '');
    setStadiumLat(p.club_stadium_lat ?? null);
    setStadiumLng(p.club_stadium_lng ?? null);
    setClubMotto(p.club_motto || '');

    if (p.account_type === 'athlete' || p.account_type === 'staff') {
      await loadPastExperiences();
    } else {
      setPastExperiences([{ ...EMPTY_PAST_EXPERIENCE }]);
    }
  }

  // prima load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadProfile();
      } catch (e: any) {
        console.error(e);
        setFatalError(e?.message ?? t('errors.profileLoad'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredPreviewProfile = useMemo(() => ({
    account_type: profile?.account_type ?? null,
    full_name: fullName,
    display_name: fullName,
    birth_year: birthYear === '' ? null : birthYear,
    country: normalizeCountryCode(country),
    sport: isClub ? sport : athleteSport,
    role: isOrganization || isFan ? null : athleteRole,
    region: isOrganization ? (clubLocation.regionName || clubLocationFallback.region || null) : profile?.region ?? null,
    province: isOrganization ? (clubLocation.provinceName || clubLocationFallback.province || null) : profile?.province ?? null,
    city: isOrganization ? (clubLocation.cityName || clubLocationFallback.city || null) : profile?.city ?? null,
    interest_region_id: isOrganization ? clubLocation.regionId : null,
    interest_province_id: isOrganization ? clubLocation.provinceId : null,
    interest_municipality_id: isOrganization ? clubLocation.municipalityId : null,
  }), [athleteRole, athleteSport, birthYear, clubLocation.cityName, clubLocation.provinceName, clubLocation.regionName, clubLocation.municipalityId, clubLocation.provinceId, clubLocation.regionId, clubLocationFallback.city, clubLocationFallback.province, clubLocationFallback.region, country, fullName, isClub, isOrganization, isFan, profile, sport]);
  const missingRequiredFields = useMemo(() => getMissingRequiredProfileFields(requiredPreviewProfile), [requiredPreviewProfile]);
  const canSave = useMemo(() => !saving && profile != null, [saving, profile]);
  const currentYear = new Date().getFullYear();
  const normalizedCountry = normalizeCountryCode(country);
  const normalizedResidenceCountry = normalizeCountryCode(residenceCountry);
  const normalizedInterestCountry = normalizeCountryCode(interestCountry || 'IT') || 'IT';
  const playerBioRemaining = PLAYER_BIO_MAX_LENGTH - bio.length;
  const clubNameValidationError = isClub ? getProfileClubNameValidationError(fullName) : null;

  function normalizeSocial(kind: keyof Links, value: string): string | null {
    const v = (value || '').trim();
    if (!v) return null;
    const isUrl = /^https?:\/\//i.test(v);
    const map: Record<keyof Links, (h: string) => string> = {
      instagram: (h) => `https://instagram.com/${h.replace(/^@/, '')}`,
      facebook: (h) => (isUrl ? h : `https://facebook.com/${h.replace(/^@/, '')}`),
      tiktok: (h) => `https://tiktok.com/@${h.replace(/^@/, '')}`,
      x: (h) => `https://twitter.com/${h.replace(/^@/, '')}`,
    };
    if (isUrl) return v;
    return map[kind](v);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const normalizedPastExperiences = pastExperiences
        .map((experience) => ensurePastExperienceCategory(sanitizePastExperience(experience)))
        .filter((experience) => !isPastExperienceEmpty(experience));

      if (!isOrganization && !isFan) {
        const partialIndex = normalizedPastExperiences.findIndex((experience) => !isPastExperienceComplete(experience));
        if (partialIndex >= 0) {
          throw new Error(`Completa tutti i campi in "Esperienze passate" alla riga ${partialIndex + 1}.`);
        }
      }

      const links: Links = {
        instagram: normalizeSocial('instagram', instagram) ?? undefined,
        facebook:  normalizeSocial('facebook',  facebook)  ?? undefined,
        tiktok:    normalizeSocial('tiktok',    tiktok)    ?? undefined,
        x:         normalizeSocial('x',         x)         ?? undefined,
      };
      Object.keys(links).forEach((k) => (links as any)[k] === undefined && delete (links as any)[k]);

      const clubRegionName = clubLocation.regionName || clubLocationFallback.region || null;
      const clubProvinceName = clubLocation.provinceName || clubLocationFallback.province || null;
      const clubCityName =
        normalizedCountry === 'IT'
          ? clubLocation.cityName || clubLocationFallback.city || null
          : clubLocation.cityName || clubLocationFallback.city || null;

      const interestRegionName =
        (isOrganization ? clubLocation : interestLocation).regionName ||
        (isOrganization ? clubLocationFallback : interestFallback).region ||
        null;
      const interestProvinceName =
        (isOrganization ? clubLocation : interestLocation).provinceName ||
        (isOrganization ? clubLocationFallback : interestFallback).province ||
        null;
      const interestCityName =
        (isOrganization ? clubLocation : interestLocation).cityName ||
        (isOrganization ? clubLocationFallback : interestFallback).city ||
        null;

      const residenceRegionName = residenceLocation.regionName || residenceFallback.region || null;
      const residenceProvinceName = residenceLocation.provinceName || residenceFallback.province || null;
      const residenceCityName =
        normalizedResidenceCountry === 'IT'
          ? residenceLocation.cityName || residenceFallback.city || null
          : residenceLocation.cityName || residenceFallback.city || null;

      const basePayload: any = {
        account_type: profile?.account_type ?? null,
        full_name: (fullName || '').trim() || null,
        display_name: (fullName || '').trim() || null,
        bio:       (bio || '').trim() || null,
        country:   normalizedCountry,   // ISO2 sempre
        avatar_url: avatarUrl || null,

        // interesse
        interest_country: isOrganization ? normalizedCountry : normalizedInterestCountry,
        interest_region_id:
          (isOrganization ? normalizedCountry : normalizedInterestCountry) === 'IT'
            ? (isOrganization ? clubLocation.regionId : interestLocation.regionId)
            : null,
        interest_province_id:
          (isOrganization ? normalizedCountry : normalizedInterestCountry) === 'IT'
            ? (isOrganization ? clubLocation.provinceId : interestLocation.provinceId)
            : null,
        interest_municipality_id:
          (isOrganization ? normalizedCountry : normalizedInterestCountry) === 'IT'
            ? (isOrganization ? clubLocation.municipalityId : interestLocation.municipalityId)
            : null,
        interest_region:
          (isOrganization ? normalizedCountry : normalizedInterestCountry) === 'IT'
            ? interestRegionName
            : interestRegionName,
        interest_province:
          (isOrganization ? normalizedCountry : normalizedInterestCountry) === 'IT'
            ? interestProvinceName
            : null,
        interest_city:
          (isOrganization ? normalizedCountry : normalizedInterestCountry) === 'IT'
            ? interestCityName
            : interestCityName,

        // social & notifiche
        links,
        notify_email_new_message: !!notifyEmail,
      };

      if (isOrganization) {
        if (isClub) {
          const clubNameError = getProfileClubNameValidationError(fullName);
          if (clubNameError) throw new Error(clubNameError);
        }

        Object.assign(basePayload, {
          sport: isClub ? (sport || '').trim() || null : null,
          club_league_category: isClub ? (clubCategory || '').trim() || null : null,
          club_foundation_year: foundationYear === '' ? null : Number(foundationYear),
          club_stadium: (stadium || '').trim() || null,
          club_stadium_address: (stadiumAddress || '').trim() || null,
          club_stadium_lat: stadiumLat ?? null,
          club_stadium_lng: stadiumLng ?? null,
          club_motto: (clubMotto || '').trim() || null,

          region: normalizedCountry === 'IT' ? clubRegionName : (clubLocation.regionName || clubLocationFallback.region || null),
          province: normalizedCountry === 'IT' ? clubProvinceName : null,
          city: clubCityName,

          // pulizia campi atleta
          birth_year: null,
          birth_place: null,
          residence_region_id: null,
          residence_province_id: null,
          residence_municipality_id: null,
          birth_country: null,
          birth_region_id: null,
          birth_province_id: null,
          birth_municipality_id: null,
          foot: null,
          height_cm: null,
          weight_kg: null,
          role: null,
        });
      } else if (isFan) {
        Object.assign(basePayload, {
          bio: null,
          links: null,
          sport: null,
          role: null,
          birth_year: null,
          birth_place: null,
          residence_region_id: null,
          residence_province_id: null,
          residence_municipality_id: null,
          birth_country: null,
          birth_region_id: null,
          birth_province_id: null,
          birth_municipality_id: null,
          foot: null,
          height_cm: null,
          weight_kg: null,
          club_league_category: null,
          club_foundation_year: null,
          club_stadium: null,
          club_stadium_address: null,
          club_stadium_lat: null,
          club_stadium_lng: null,
          club_motto: null,
          region: null,
          province: null,
          city: null,
        });
      } else {
        // PLAYER
        Object.assign(basePayload, {
          birth_year: birthYear === '' ? null : Number(birthYear),

          region: normalizedResidenceCountry === 'IT' ? residenceRegionName : residenceLocation.regionName || residenceFallback.region || null,
          province: normalizedResidenceCountry === 'IT' ? residenceProvinceName : null,
          city: residenceCityName,

          // residenza (non più mostrata, uso la zona di interesse come riferimento principale)
          residence_region_id: normalizedResidenceCountry === 'IT' ? residenceLocation.regionId : null,
          residence_province_id: normalizedResidenceCountry === 'IT' ? residenceLocation.provinceId : null,
          residence_municipality_id: normalizedResidenceCountry === 'IT' ? residenceLocation.municipalityId : null,

          // nascita
          birth_country: normalizeCountryCode(birthCountry), // <<< ISO2
          birth_region_id:      birthCountry === 'IT' ? birthRegionId      : null,
          birth_province_id:    birthCountry === 'IT' ? birthProvinceId    : null,
          birth_municipality_id:birthCountry === 'IT' ? birthMunicipalityId: null,
          birth_place:          birthCountry !== 'IT' ? (birthPlace || '').trim() || null : null,

          // atleta
          foot: (foot || '').trim() || null,
          height_cm: heightCm === '' ? null : Number(heightCm),
          weight_kg: weightKg === '' ? null : Number(weightKg),
          sport: (athleteSport || '').trim() || null,
          role: (athleteRole || '').trim() || null,

          // pulizia campi club
          club_league_category: null,
          club_foundation_year: null,
          club_stadium: null,
          club_stadium_address: null,
          club_stadium_lat: null,
          club_stadium_lng: null,
          club_motto: null,
        });
      }

      const missingFields = getMissingRequiredProfileFields(basePayload);
      if (missingFields.length > 0) {
        throw new Error(`Completa i campi obbligatori: ${missingFields.join(', ')}.`);
      }

      const r = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Salvataggio non riuscito');
      }

      if (!isOrganization && !isFan) {
        const experiencesRes = await fetch('/api/profiles/me/experiences', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ experiences: normalizedPastExperiences }),
        });
        if (!experiencesRes.ok) {
          const j = await experiencesRes.json().catch(() => ({}));
          throw new Error(j?.error ?? 'Salvataggio esperienze non riuscito');
        }
      }

      await loadProfile();
      setMessage(t('profile.saved'));
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? t('profile.saveError'));
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  const updatePastExperience = (index: number, patch: Partial<PastExperience>) => {
    setPastExperiences((prev) =>
      prev.map((experience, currentIndex) => {
        if (currentIndex !== index) return experience;
        const next = ensurePastExperienceCategory({ ...experience, ...patch });
        return next;
      }),
    );
  };

  const addPastExperience = () => {
    setPastExperiences((prev) => [...prev, { ...EMPTY_PAST_EXPERIENCE }]);
  };

  useEffect(() => {
    const query = pastExperienceClubQuery.trim();
    if (query.length < 2) {
      setPastExperienceClubOptions([]);
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ q: query });
          const response = await fetch(`/api/registry/clubs/search?${params.toString()}`, {
            cache: 'no-store',
          });
          const json = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            items?: Array<{ name?: string | null }>;
          };
          if (!response.ok || !json?.ok) {
            setPastExperienceClubOptions([]);
            return;
          }
          const options = Array.from(
            new Set(
              (json.items ?? [])
                .map((item) => String(item?.name ?? '').trim())
                .filter((name) => !!name),
            ),
          );
          setPastExperienceClubOptions(options);
        } catch {
          setPastExperienceClubOptions([]);
        }
      })();
    }, 250);

    return () => clearTimeout(timer);
  }, [pastExperienceClubQuery]);

  const handlePastExperienceClubChange = (index: number, club: string) => {
    updatePastExperience(index, { club });
    setPastExperienceClubQuery(club);
  };

  const removePastExperience = (index: number) => {
    setPastExperiences((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length > 0 ? next : [{ ...EMPTY_PAST_EXPERIENCE }];
    });
  };

  if (loading) return <div className="rounded-xl border p-4 text-sm text-gray-600">{t('common.loading')}</div>;
  if (fatalError) return <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{fatalError}</div>;
  if (!profile) return null;

  const countryPreview = country ? [iso2ToFlagEmoji(country), countryName(country)].filter(Boolean).join(' ') : '';
  const publicationStatus = profile.profile_visibility_status;
  const publicationCopy = getProfileVisibilityStatusCopy(publicationStatus);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
        <div className={`rounded-2xl border p-4 shadow-sm ${publicationCopy.className}`} role="status">
          <p className="font-semibold">{publicationCopy.label}</p>
          <p className="mt-1 text-sm">{publicationCopy.description}</p>
        </div>
        {isClub && profile.club_name_review_status === 'pending' && (
          <div className="rounded-2xl border border-violet-300 bg-violet-50 p-4 text-violet-950" role="status">
            <p className="font-semibold">Nome Club in revisione</p>
            <p className="mt-1 text-sm">{profile.club_name_review_reason || 'La denominazione deve essere verificata prima della pubblicazione.'}</p>
          </div>
        )}
        {isClub && profile.club_name_review_status === 'rejected' && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-950" role="alert">
            <p className="font-semibold">Nome Club non approvato</p>
            <p className="mt-1 text-sm">Modifica la denominazione oppure collega il profilo al Registro Club.</p>
          </div>
        )}
        {missingRequiredFields.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm" role="alert">
            <p className="font-semibold">{t('profile.completeTitle')}</p>
            <p className="mt-2 text-sm">
              {t('profile.completeHelp')}
            </p>
            <p className="mt-2 text-sm">{t('profile.missingFields', { fields: missingRequiredFields.join(', ') })}</p>
          </div>
        )}
        {/* Dati personali / club */}
        <section className="rounded-2xl border p-4 md:p-5">
          <h2 className="mb-3 text-lg font-semibold">
            {isOrganization ? t('profile.editOrganization', { organization: organizationLabel }) : t('profile.personalData')}
          </h2>

          {isOrganization ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-sm text-gray-600">{t('club.photo')}</label>
                  <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{t('profile.photoFeedHelp')}</span>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(null)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        {t('club.removePhoto')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-1 md:col-span-2">
                  <label className="text-sm text-gray-600">{t('profile.organizationName', { organization: organizationLabel })}<RequiredMark /></label>
                  <input
                    className={`w-full min-w-0 rounded-lg border p-2 ${
                      clubNameValidationError ? 'border-red-400 bg-red-50' : ''
                    }`}
                    value={fullName}
                    onChange={(e) => setFullName(sanitizeProfileClubName(e.target.value))}
                    aria-invalid={Boolean(clubNameValidationError)}
                    aria-describedby={clubNameValidationError ? 'club-name-validation-error' : undefined}
                    placeholder={isInstitution ? 'Es. Federazione Italiana Esempio' : 'Es. ASD Carlentini'}
                  />
                  {clubNameValidationError && (
                    <p id="club-name-validation-error" className="text-xs font-medium text-red-600">
                      {clubNameValidationError}
                    </p>
                  )}
                  {isClub && !clubNameValidationError && (
                    <p className="text-xs text-gray-500">
                      Usa la denominazione ufficiale del club o una sigla societaria (es. ASD, SSD, FC), non nome e cognome di una persona.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('profile.organizationCountry', { organization: organizationLabel })}<RequiredMark /></label>
                  <select
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {WORLD_COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                {country && (
                  <span className="text-xs text-gray-500">{countryPreview}</span>
                )}
              </div>

                <LocationFields
                  supabase={supabase}
                  country={country}
                  value={clubLocation}
                  fallback={clubLocationFallback}
                  onChange={setClubLocation}
                  labels={{
                    region: t('profile.organizationRegion', { organization: organizationLabel }),
                    province: t('profile.organizationProvince', { organization: organizationLabel }),
                    city: t('profile.organizationCity', { organization: organizationLabel }),
                  }}
                  required
                />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-sm text-gray-600">{t('profile.motto', { organization: organizationLabel })}</label>
                <input
                  className="w-full min-w-0 rounded-lg border p-2"
                  value={clubMotto}
                  onChange={(e) => setClubMotto(e.target.value)}
                  placeholder="Es. Caesarea et inexpugnabilis"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {isClub && (
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('profile.clubSport')}<RequiredMark /></label>
                  <select
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                  >
                    {CLUB_SPORT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                {isClub && (
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('club.category')}</label>
                  <select
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={clubCategory}
                    onChange={(e) => setClubCategory(e.target.value)}
                  >
                    {sportCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('club.foundationYear')}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={foundationYear}
                    onChange={(e) =>
                      setFoundationYear(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    min={1850}
                    max={currentYear}
                    placeholder="es. 1926"
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 md:col-span-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{t('profile.geolocation')}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">{t('profile.mapPosition', { organization: organizationTitle })}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {isInstitution ? 'Salva la sede principale: sulla mappa degli enti il tuo logo comparirà in questo punto.' : 'Salva la sede o l’impianto principale: sulla mappa dei Club il tuo logo comparirà in questo punto.'}
                    </p>
                  </div>
                  <ClubStadiumMapPicker
                    value={{ name: stadium, address: stadiumAddress, lat: stadiumLat, lng: stadiumLng }}
                    labels={isInstitution ? {
                      searchLabel: 'Cerca sede o indirizzo',
                      placeholder: 'Digita nome sede o indirizzo',
                      defaultName: 'Sede ente',
                      markerFallback: 'Sede ente',
                      helperText: 'Clicca sulla mappa oppure usa la posizione del dispositivo per impostare dove mostrare il logo dell’Ente sulla mappa nazionale.',
                    } : undefined}
                    onChange={(val) => {
                      setStadium(val.name || '');
                      setStadiumAddress(val.address || '');
                      setStadiumLat(val.lat ?? null);
                      setStadiumLng(val.lng ?? null);
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 md:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">{isInstitution ? t('profile.venueName') : t('profile.stadiumName')}</div>
                  <div className="font-semibold text-gray-900">{stadium || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">{t('club.address')}</div>
                  <div className="font-semibold text-gray-900">{stadiumAddress || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">{t('profile.coordinates')}</div>
                  <div className="font-semibold text-gray-900">
                    {stadiumLat != null && stadiumLng != null
                      ? `${stadiumLat.toFixed(5)}, ${stadiumLng.toFixed(5)}`
                      : '—'}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600">
                    {isInstitution
                      ? 'Usa la ricerca, la posizione del dispositivo o clicca sulla mappa per posizionare la sede: salveremo nome e indirizzo da mostrare come localizzazione pubblica dell’Ente.'
                      : 'Usa la ricerca, la posizione del dispositivo o clicca sulla mappa per posizionare il marker: salveremo nome, indirizzo e coordinate usate dal segnaposto con il logo del Club.'}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-sm text-gray-600">{t('club.biography')}</label>
                <textarea
                  className="w-full min-w-0 rounded-lg border p-2"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('profile.clubBiographyPlaceholder')}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm text-gray-600">{t('club.photo')}</label>
                <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{t('profile.photoFeedHelp')}</span>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(null)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      {t('club.removePhoto')}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-1 md:col-span-2">
                <label className="text-sm text-gray-600">{isFan ? t('profile.displayName') : t('profile.fullName')}<RequiredMark /></label>
                <input
                  className="w-full min-w-0 rounded-lg border p-2"
                  value={fullName}
                  onChange={(e) => setFullName(isFan ? e.target.value : sanitizeProfilePersonName(e.target.value))}
                  placeholder="Es. Mario Rossi"
                />
              </div>

              {!isFan && (
              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-sm text-gray-600">{t('profile.birthYear')}<RequiredMark /></label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full min-w-0 rounded-lg border p-2"
                  value={birthYear}
                  onChange={(e) =>
                    setBirthYear(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  min={1930}
                  max={new Date().getFullYear() - 5}
                  placeholder="Es. 2002"
                />
              </div>
              )}

              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-sm text-gray-600">{t('profile.nationality')}<RequiredMark /></label>
                <select
                  className="w-full min-w-0 rounded-lg border p-2"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {WORLD_COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {country && (
                  <span className="text-xs text-gray-500">{countryPreview}</span>
                )}
              </div>

              {!isFan && (
              <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('opportunities.sport')}<RequiredMark /></label>
                  <select
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={athleteSport}
                    onChange={(e) => setAthleteSport(e.target.value)}
                  >
                    {SPORTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('profile.role')}<RequiredMark /></label>
                  <select
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={athleteRole}
                    onChange={(e) => setAthleteRole(e.target.value)}
                  >
                    <option value="">— {t('profile.select')} —</option>
                    {athleteRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    {isStaff
                      ? t('profile.staffRoleHelp')
                      : t('profile.playerRoleHelp')}
                  </p>
                </div>
              </div>
              )}

              {!isFan && (
              <div className="md:col-span-2 flex min-w-0 flex-col gap-1">
                <label className="text-sm text-gray-600">{t('club.biography')}</label>
                <textarea
                  className="w-full min-w-0 rounded-lg border p-2"
                  rows={4}
                  maxLength={PLAYER_BIO_MAX_LENGTH}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, PLAYER_BIO_MAX_LENGTH))}
                  placeholder={t('profile.biographyPlaceholder')}
                />
                <p className={`text-xs ${playerBioRemaining <= PLAYER_BIO_WARNING_THRESHOLD ? 'text-red-600' : 'text-gray-500'}`}>
                  {t('profile.remainingChars', { count: playerBioRemaining })}
                </p>
              </div>
              )}

              {!isFan && !isStaff && (
              <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('profile.preferredSide')}</label>
                  <select
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={foot}
                    onChange={(e) => setFoot(e.target.value)}
                  >
                    <option value="">— {t('profile.select')} —</option>
                    <option value="Destro">Destro</option>
                    <option value="Sinistro">Sinistro</option>
                    <option value="Ambidestro">Ambidestro</option>
                  </select>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('profile.height')} (cm)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={heightCm}
                    onChange={(e) =>
                      setHeightCm(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    min={100}
                    max={230}
                    placeholder="es. 183"
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="text-sm text-gray-600">{t('profile.weight')} (kg)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full min-w-0 rounded-lg border p-2"
                    value={weightKg}
                    onChange={(e) =>
                      setWeightKg(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    min={40}
                    max={150}
                    placeholder="es. 85"
                  />
                </div>
              </div>
              )}
            </div>
          )}
        </section>

        {!isOrganization && !isFan && (
          <section className="rounded-2xl border p-4 md:p-5">
            <h2 className="mb-3 text-lg font-semibold">{t('profile.pastExperiences')}</h2>
            <div className="space-y-3">
              {pastExperiences.map((experience, index) => {
                const categoryOptions = getPastExperienceCategoriesBySport(experience.sport);
                const roleOptions = isStaff
                  ? [...STAFF_ROLES]
                  : SPORTS_ROLES[normalizeSport(experience.sport) ?? experience.sport] ?? [];
                return (
                  <div key={`past-experience-${index}`} className="rounded-xl border border-gray-200 p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                      <div className="flex min-w-0 flex-col gap-1">
                        <label className="text-sm text-gray-600">{t('profile.season')}</label>
                        <select
                          className="w-full min-w-0 rounded-lg border p-2"
                          value={experience.season}
                          onChange={(e) => updatePastExperience(index, { season: e.target.value })}
                        >
                          <option value="">— {t('profile.select')} —</option>
                          {seasonOptions.map((season) => (
                            <option key={season} value={season}>
                              {season}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex min-w-0 flex-col gap-1">
                        <label className="text-sm text-gray-600">Club</label>
                        <input
                          className="w-full min-w-0 rounded-lg border p-2"
                          value={experience.club}
                          onChange={(e) => handlePastExperienceClubChange(index, e.target.value)}
                          placeholder="Es. ASD Carlentini"
                          list="past-experience-club-options"
                          autoComplete="off"
                        />
                      </div>

                      <div className="flex min-w-0 flex-col gap-1">
                        <label className="text-sm text-gray-600">{t('opportunities.sport')}<RequiredMark /></label>
                        <select
                          className="w-full min-w-0 rounded-lg border p-2"
                          value={experience.sport}
                          onChange={(e) => updatePastExperience(index, { sport: e.target.value, role: isStaff ? experience.role : '' })}
                        >
                          <option value="">— {t('profile.select')} —</option>
                          {CLUB_SPORT_OPTIONS.map((sportOption) => (
                            <option key={sportOption} value={sportOption}>
                              {sportOption}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex min-w-0 flex-col gap-1">
                        <label className="text-sm text-gray-600">{t('profile.role')}<RequiredMark /></label>
                        <select
                          className="w-full min-w-0 rounded-lg border p-2"
                          value={experience.role}
                          onChange={(e) => updatePastExperience(index, { role: e.target.value })}
                          disabled={!isStaff && !experience.sport}
                        >
                          <option value="">— {t('profile.select')} —</option>
                          {roleOptions.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>
                              {roleOption}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex min-w-0 flex-col gap-1">
                        <label className="text-sm text-gray-600">{t('club.category')}</label>
                        <select
                          className="w-full min-w-0 rounded-lg border p-2"
                          value={experience.category}
                          onChange={(e) => updatePastExperience(index, { category: e.target.value })}
                          disabled={!experience.sport}
                        >
                          <option value="">— {t('profile.select')} —</option>
                          {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {pastExperiences.length > 1 && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          className="text-sm font-medium text-red-600 hover:underline"
                          onClick={() => removePastExperience(index)}
                        >
                          Rimuovi esperienza
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                className="text-sm font-semibold text-blue-700 hover:underline"
                onClick={addPastExperience}
              >
                + {t('profile.addExperience')}
              </button>
            </div>
            <datalist id="past-experience-club-options">
              {pastExperienceClubOptions.map((clubName) => (
                <option key={clubName} value={clubName} />
              ))}
            </datalist>
          </section>
        )}

        {/* Zona di interesse (atleta) */}
        {!isOrganization && (
          <section className="rounded-2xl border p-4 md:p-5">
            <h2 className="mb-3 text-lg font-semibold">{t('profile.interestArea')}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-sm text-gray-600">{t('profile.country')}</label>
                <select
                  className="w-full min-w-0 rounded-lg border p-2"
                  value={interestCountry}
                  onChange={(e) => setInterestCountry(e.target.value)}
                >
                  {WORLD_COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <LocationFields
                supabase={supabase}
                country={interestCountry}
                value={interestLocation}
                fallback={interestFallback}
                onChange={setInterestLocation}
                labels={{ region: t('opportunities.region'), province: t('opportunities.province'), city: t('opportunities.city') }}
              />
            </div>
          </section>
        )}

        {/* Social */}
        {!isFan && (
        <section className="rounded-2xl border p-4 md:p-5">
          <h2 className="mb-3 text-lg font-semibold">{t('profile.socialProfiles')}</h2>
          <p className="mb-3 text-xs text-gray-500">
            {t('profile.socialHelp')}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-sm text-gray-600">Instagram</label>
              <input
                className="w-full min-w-0 rounded-lg border p-2"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@tuonome oppure https://instagram.com/tuonome"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-sm text-gray-600">Facebook</label>
              <input
                className="w-full min-w-0 rounded-lg border p-2"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="pagina o profilo"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-sm text-gray-600">TikTok</label>
              <input
                className="w-full min-w-0 rounded-lg border p-2"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@tuonome"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-sm text-gray-600">X (Twitter)</label>
              <input
                className="w-full min-w-0 rounded-lg border p-2"
                value={x}
                onChange={(e) => setX(e.target.value)}
                placeholder="@tuonome"
              />
            </div>
          </div>
        </section>
        )}

        {/* Notifiche */}
        {!isFan && (
        <section className="rounded-2xl border p-4 md:p-5">
          <h2 className="mb-3 text-lg font-semibold">{t('profile.notifications')}</h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
            />
            <span className="text-sm">{t('profile.emailMessages')}</span>
          </label>
        </section>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? t('settings.saving') : t('common.save')}
          </button>
          {message && <span className="text-sm text-green-700">{message}</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </form>
  );
}
