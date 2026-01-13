import { normalizeSport, SPORTS_ROLES } from '@/lib/opps/constants';

type RosterMember = {
  role?: string | null;
  fullName?: string | null;
  displayName?: string | null;
  name?: string | null;
};

type RosterRoleSection<T> = {
  roleLabel: string;
  members: T[];
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

function sortMembersByName<T extends RosterMember>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const aName = getMemberName(a).toLocaleLowerCase('it');
    const bName = getMemberName(b).toLocaleLowerCase('it');
    return aName.localeCompare(bName, 'it', { sensitivity: 'base' });
  });
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

export function buildRosterRoleSections<T extends RosterMember>(members: T[], sportKey?: string | null): RosterRoleSection<T>[] {
  const normalizedSport = normalizeSport(sportKey) ?? '';
  const roleList = SPORTS_ROLES[normalizedSport] ?? [];
  const roleIndex = getRoleIndexMap(sportKey);
  const roleGroups = new Map<string, T[]>();
  const unknownMembers: T[] = [];

  members.forEach((member) => {
    const normalizedRole = member.role ? normalizeKey(member.role) : '';
    const index = roleIndex.get(normalizedRole);
    if (index == null) {
      unknownMembers.push(member);
      return;
    }
    const roleLabel = roleList[index] ?? member.role ?? '';
    if (!roleLabel) {
      unknownMembers.push(member);
      return;
    }
    const existing = roleGroups.get(roleLabel);
    if (existing) {
      existing.push(member);
    } else {
      roleGroups.set(roleLabel, [member]);
    }
  });

  const sections = roleList
    .map((roleLabel) => ({ roleLabel, members: roleGroups.get(roleLabel) ?? [] }))
    .filter((section) => section.members.length > 0)
    .map((section) => ({
      roleLabel: section.roleLabel,
      members: sortMembersByName(section.members),
    }));

  if (unknownMembers.length > 0) {
    sections.push({ roleLabel: 'Altro', members: sortMembersByName(unknownMembers) });
  }

  return sections;
}
