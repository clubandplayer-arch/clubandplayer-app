import Link from 'next/link';

type Links = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
};

type Profile = {
  account_type?: 'club' | 'athlete' | string | null;

  display_name?: string | null;
  full_name?: string | null;
  country?: string | null;

  // atleta
  sport?: string | null;
  role?: string | null;
  foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;

  // club
  club_league_category?: string | null;
  club_foundation_year?: number | null;
  club_stadium?: string | null;

  avatar_url?: string | null;
  links?: Links | null;
};

const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB',
  'u.k.': 'GB',
  'united kingdom': 'GB',
  'great britain': 'GB',
  usa: 'US',
  'u.s.a.': 'US',
  'united states': 'US',
  'stati uniti': 'US',
  'czech republic': 'CZ',
  'repubblica ceca': 'CZ',
  "cote d'ivoire": 'CI',
  'cote d’ivoire': 'CI',
  "côte d’ivoire": 'CI',
  russia: 'RU',
  'south korea': 'KR',
  'north korea': 'KP',
  'viet nam': 'VN',
};

function safeTrim(v?: string | null): string {
  return (v ?? '').trim();
}

function nameToIso2(v?: string | null): string | null {
  const raw = safeTrim(v);
  if (!raw) return null;

  // già ISO2
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();

  const key = raw.toLowerCase();
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];

  try {
    const regionCodes: string[] =
      (Intl as any).supportedValuesOf?.('region') ?? [];
    const dnIt = new Intl.DisplayNames(['it'], { type: 'region' });
    const dnEn = new Intl.DisplayNames(['en'], { type: 'region' });

    for (const code of regionCodes) {
      if (
        (dnIt.of(code) || '').toLowerCase() === key ||
        (dnEn.of(code) || '').toLowerCase() === key
      ) {
        return code.toUpperCase();
      }
    }
  } catch {
    // fallback sotto
  }

  return raw.toUpperCase();
}

function flagEmoji(iso2?: string | null): string {
  const code = nameToIso2(iso2);
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  const base = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  return (
    String.fromCodePoint(base + code.charCodeAt(0) - a) +
    String.fromCodePoint(base + code.charCodeAt(1) - a)
  );
}

function countryLabel(v?: string | null): string {
  const code = nameToIso2(v);
  if (!code) return '';
  try {
    const dn = new Intl.DisplayNames(['it'], { type: 'region' });
    const name = dn.of(code) || code;
    return name;
  } catch {
    return code;
  }
}

function displayName(p?: Profile | null): string {
  return (
    safeTrim(p?.display_name) ||
    safeTrim(p?.full_name) ||
    'Profilo'
  );
}

function isClub(p?: Profile | null): boolean {
  return (p?.account_type ?? '').toLowerCase() === 'club';
}

function isAthlete(p?: Profile | null): boolean {
  return (p?.account_type ?? '').toLowerCase() === 'athlete';
}

function normalizeUrl(url?: string | null): string | null {
  const v = safeTrim(url);
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

/**
 * Card profilo compatibile con i dati CODEX:
 * - CLUB: box ricco con nazionalità, sport, categoria, fondazione, stadio.
 * - ATLETA: nome, ruolo, sport, dati fisici base.
 * - fallback: box semplice.
 */
export default function ProfileMiniCard({
  profile,
}: {
  profile?: Profile | null;
}) {
  const name = displayName(profile);
  const country = profile?.country;
  const flag = flagEmoji(country);
  const countryText = countryLabel(country);

  const avatarUrl = normalizeUrl(profile?.avatar_url);

  // CLUB VIEW
  if (isClub(profile)) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gray-200 text-lg font-semibold text-gray-700">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex flex-col">
            <div className="text-sm text-gray-500">Il tuo profilo</div>
            <div className="text-base font-semibold leading-tight">
              {name}
            </div>
            {countryText && (
              <div className="text-xs text-gray-500">
                Nazionalità:{' '}
                {flag && <span className="mr-1">{flag}</span>}
                {countryText}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
          {profile?.sport && (
            <div>
              <span className="font-semibold">Sport: </span>
              <span>{profile.sport}</span>
            </div>
          )}
          {profile?.club_league_category && (
            <div>
              <span className="font-semibold">Categoria: </span>
              <span>{profile.club_league_category}</span>
            </div>
          )}
          {profile?.club_foundation_year && (
            <div>
              <span className="font-semibold">Fondazione: </span>
              <span>{profile.club_foundation_year}</span>
            </div>
          )}
          {safeTrim(profile?.club_stadium) && (
            <div>
              <span className="font-semibold">Stadio: </span>
              <span>{safeTrim(profile?.club_stadium)}</span>
            </div>
          )}
        </div>

        <div className="flex">
          <Link
            href="/club/profile"
            className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
          >
            Modifica profilo
          </Link>
        </div>
      </div>
    );
  }

  // ATLETA VIEW
  if (isAthlete(profile)) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex flex-col">
            <div className="text-sm text-gray-500">Il tuo profilo</div>
            <div className="text-base font-semibold leading-tight">
              {name}
            </div>
            {countryText && (
              <div className="text-xs text-gray-500">
                {flag && <span className="mr-1">{flag}</span>}
                {countryText}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
          {profile?.sport && (
            <div>
              <span className="font-semibold">Sport: </span>
              <span>{profile.sport}</span>
            </div>
          )}
          {profile?.role && (
            <div>
              <span className="font-semibold">Ruolo: </span>
              <span>{profile.role}</span>
            </div>
          )}
          {profile?.height_cm && (
            <div>
              <span className="font-semibold">Altezza: </span>
              <span>{profile.height_cm} cm</span>
            </div>
          )}
          {profile?.weight_kg && (
            <div>
              <span className="font-semibold">Peso: </span>
              <span>{profile.weight_kg} kg</span>
            </div>
          )}
        </div>

        <div className="flex">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
          >
            Modifica profilo
          </Link>
        </div>
      </div>
    );
  }

  // FALLBACK
  return (
    <Link
      href="/profile"
      className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 hover:bg-gray-50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-col">
        <div className="text-sm text-gray-500">Il tuo profilo</div>
        <div className="text-base font-semibold leading-tight">
          {name}
        </div>
      </div>
    </Link>
  );
}
