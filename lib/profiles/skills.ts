import { ProfileSkill } from '@/types/profile';

export const MAX_SKILLS = 10;
export const MAX_SKILL_LENGTH = 40;

export function normalizeSkillName(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const name = String(raw).trim();
  if (!name) return null;
  return name.length > MAX_SKILL_LENGTH ? name.slice(0, MAX_SKILL_LENGTH) : name;
}

export function normalizeProfileSkills(
  raw: unknown,
  options: {
    countsBySkill?: Map<string, number>;
    endorsedByMe?: Set<string>;
  } = {},
): ProfileSkill[] {
  if (!Array.isArray(raw)) return [];
  const out: ProfileSkill[] = [];

  for (const item of raw) {
    if (out.length >= MAX_SKILLS) break;
    if (!item || typeof item !== 'object') continue;

    const name = normalizeSkillName((item as any).name);
    if (!name) continue;

    const endorsementsRaw = Number((item as any).endorsements_count ?? (item as any).endorsementsCount ?? 0);
    const endorsementsCount = Number.isFinite(endorsementsRaw) && endorsementsRaw > 0
      ? Math.floor(endorsementsRaw)
      : 0;

    out.push({
      name,
      endorsementsCount: options.countsBySkill?.get(name.toLowerCase()) ?? endorsementsCount,
      endorsedByMe: options.endorsedByMe?.has(name.toLowerCase()) ?? false,
    });
  }

  return out;
}

export function parseSkillsInput(
  raw: unknown,
): { name: string; endorsements_count: number }[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;

  let arr: unknown[] | null = null;
  if (Array.isArray(raw)) arr = raw;
  if (!arr && typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed as unknown[];
    } catch {
      arr = null;
    }
  }
  if (!arr) return null;

  const skills: { name: string; endorsements_count: number }[] = [];
  for (const item of arr) {
    if (skills.length >= MAX_SKILLS) break;
    if (!item || typeof item !== 'object') continue;

    const name = normalizeSkillName((item as any).name);
    if (!name) continue;

    const endorsements = Number((item as any).endorsements_count ?? (item as any).endorsementsCount ?? 0);
    const endorsements_count = Number.isFinite(endorsements) && endorsements > 0 ? Math.floor(endorsements) : 0;

    skills.push({ name, endorsements_count });
  }

  return skills;
}

export function toDbSkills(skills: ProfileSkill[]): { name: string; endorsements_count: number }[] {
  return skills.slice(0, MAX_SKILLS).map((skill) => ({
    name: normalizeSkillName(skill.name) ?? '',
    endorsements_count: Number.isFinite(skill.endorsementsCount)
      ? Math.max(0, Math.floor(skill.endorsementsCount))
      : 0,
  })).filter((s) => !!s.name);
}

export function buildCountsMap(rows: Array<{ skill_name?: string | null; endorsements_count?: number }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = normalizeSkillName(row.skill_name);
    if (!name) continue;
    const count = Number(row.endorsements_count ?? 0);
    map.set(name.toLowerCase(), Number.isFinite(count) && count > 0 ? Math.floor(count) : 0);
  }
  return map;
}

export function buildEndorsedSet(rows: Array<{ skill_name?: string | null }>): Set<string> {
  const set = new Set<string>();
  for (const row of rows) {
    const name = normalizeSkillName(row.skill_name);
    if (!name) continue;
    set.add(name.toLowerCase());
  }
  return set;
}
