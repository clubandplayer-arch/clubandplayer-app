import { normalizeSport, SPORTS_ROLES } from '@/lib/opps/constants';

type RosterMember = {
  role?: string | null;
  fullName?: string | null;
  displayName?: string | null;
  name?: string | null;
};

export function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getRoleIndexMap(sportKey?: string | null): Map<string, number> {
  const normalizedSport = normalizeSport(sportKey) ?? '';
  const roleList = SPORTS_ROLES[normalizedSport] ?? [];
  return new Map(roleList.map((role, index) => [normalizeKey(role), index]));
}

function getMemberName(member: RosterMember): string {
  return (member.fullName || member.displayName || member.name || '').trim();
}

export function sortRosterMembersByRole<T extends RosterMember>(members: T[], sportKey?: string | null): T[] {
  const roleIndex = getRoleIndexMap(sportKey);
  return [...members].sort((a, b) => {
    const aRole = a.role ? normalizeKey(a.role) : '';
    const bRole = b.role ? normalizeKey(b.role) : '';
    const aIdx = roleIndex.get(aRole) ?? 9999;
    const bIdx = roleIndex.get(bRole) ?? 9999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    const aName = getMemberName(a).toLocaleLowerCase('it');
    const bName = getMemberName(b).toLocaleLowerCase('it');
    return aName.localeCompare(bName, 'it', { sensitivity: 'base' });
  });
}
