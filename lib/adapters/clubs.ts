// lib/adapters/clubs.ts
import type { Club } from '@/types/club';

export type ClubListItem = Club & {
  /** Etichetta standardizzata per la UI */
  displayLabel?: string;
};

/** Collator locale-aware (Italiano), case-insensitive, ignore punctuation */
const collator = new Intl.Collator('it', {
  sensitivity: 'base',
  ignorePunctuation: true,
  numeric: false,
});

/** Mappa un record API in un item UI mantenendo tutte le proprietà originali */
export function mapClubListItem(c: Club): ClubListItem {
  const displayLabel = c.display_name || c.name || '—';
  return { ...c, displayLabel };
}

/** Mappa e ordina (A→Z) l’intera lista in modo safe */
export function mapClubsList(list: Club[] | null | undefined): ClubListItem[] {
  if (!Array.isArray(list)) return [];
  const mapped = list.map(mapClubListItem);
  // Ordina per displayLabel in modo stabile/locale-aware
  mapped.sort((a, b) => collator.compare(a.displayLabel ?? '—', b.displayLabel ?? '—'));
  return mapped;
}
