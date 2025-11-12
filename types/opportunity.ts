/**
 * Source of truth per le Opportunity.
 * - Espone sia snake_case (DB) che camelCase (UI)
 * - Fornisce normalizeOpportunity(...) per ottenere un oggetto ibrido completo
 */

export type OpportunityStatus = 'open' | 'closed' | 'draft' | 'archived';

export type OpportunityRole =
  | 'athlete'
  | 'coach'
  | 'staff'
  | 'scout'
  | 'physio'
  | 'other'
  | string; // estensibile senza rompere l'app

export interface OpportunitySnake {
  id: string;
  title: string;
  description?: string | null;

  // riferimenti/owner
  owner_id?: string | null;
  created_by?: string | null;

  // meta "club"
  club_name?: string | null;

  // localizzazione
  city?: string | null;
  province?: string | null;
  region?: string | null;
  country?: string | null; // ISO2 o testo libero, mantenuto compat

  // stato/ruolo
  role?: OpportunityRole | null;
  status?: OpportunityStatus | null;

  // auditing
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OpportunityCamel {
  id: string;
  title: string;
  description?: string | null;

  // riferimenti/owner
  ownerId?: string | null;
  createdBy?: string | null;

  // meta "club"
  clubName?: string | null;

  // localizzazione
  city?: string | null;
  province?: string | null;
  region?: string | null;
  country?: string | null;

  // stato/ruolo
  role?: OpportunityRole | null;
  status?: OpportunityStatus | null;

  // auditing
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Tipo finale usato nell’app: include entrambe le forme per massima compatibilità
 * con componenti legacy e nuovo codice.
 */
export type Opportunity = OpportunitySnake & OpportunityCamel;

/**
 * Normalizza un’opportunità (snake o camel) restituendo sempre il tipo ibrido Opportunity.
 * - Copre i campi comuni e duplica dove serve (owner_id/ownerId, ecc.)
 * - Evita undefined: i campi opzionali sono normalizzati a null quando assenti.
 */
export const normalizeOpportunity = (
  o: OpportunitySnake | OpportunityCamel
): Opportunity => {
  const s = o as OpportunitySnake;
  const c = o as OpportunityCamel;

  const id = (s.id ?? c.id)!;

  return {
    id,
    title: (s.title ?? c.title) as string,
    description: s.description ?? c.description ?? null,

    owner_id: s.owner_id ?? c.ownerId ?? null,
    ownerId: c.ownerId ?? s.owner_id ?? null,

    created_by: s.created_by ?? c.createdBy ?? null,
    createdBy: c.createdBy ?? s.created_by ?? null,

    club_name: s.club_name ?? c.clubName ?? null,
    clubName: c.clubName ?? s.club_name ?? null,

    city: s.city ?? c.city ?? null,
    province: s.province ?? c.province ?? null,
    region: s.region ?? c.region ?? null,
    country: s.country ?? c.country ?? null,

    role: (s.role ?? c.role ?? null) as OpportunityRole | null,
    status: (s.status ?? c.status ?? null) as OpportunityStatus | null,

    created_at: s.created_at ?? c.createdAt ?? null,
    createdAt: c.createdAt ?? s.created_at ?? null,

    updated_at: s.updated_at ?? c.updatedAt ?? null,
    updatedAt: c.updatedAt ?? s.updated_at ?? null,
  };
};
