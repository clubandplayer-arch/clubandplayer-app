import type { Club } from '@/types/club';

export type ClubListItem = Club & { displayLabel?: string };

export function mapClubListItem(c: Club): ClubListItem {
  const displayLabel = c.display_name || c.name || '—';
  return { ...c, displayLabel };
}

export function mapClubsList(list: Club[] | null | undefined): ClubListItem[] {
  if (!Array.isArray(list)) return [];
  return list.map(mapClubListItem);
}
