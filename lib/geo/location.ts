import { SupabaseClient } from '@supabase/supabase-js';

export type LocationLevel = 'region' | 'province' | 'municipality';
export type LocationOption = { id: number; name: string };

export const sortByLocationName = (arr: LocationOption[]) =>
  [...arr].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'accent' }));

export const normalizeLocation = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

export const resolveLocationId = (options: LocationOption[], target?: string | null) => {
  const normalizedTarget = normalizeLocation(target);
  if (!normalizedTarget) return null;

  const direct = options.find((opt) => normalizeLocation(opt.name) === normalizedTarget);
  if (direct) return direct.id;

  const partial = options.find((opt) => {
    const normalizedOpt = normalizeLocation(opt.name);
    return normalizedOpt && (normalizedOpt.startsWith(normalizedTarget) || normalizedTarget.startsWith(normalizedOpt));
  });

  return partial?.id ?? null;
};

export const findMatchingLocationId = (
  options: LocationOption[],
  target?: string | number | null,
) => {
  if (target == null) return null;
  const asString = typeof target === 'number' ? String(target) : target;

  const byId = options.find((opt) => String(opt.id) === asString);
  if (byId) return byId.id;

  return resolveLocationId(options, asString);
};

export async function fetchLocationChildren(
  supabase: SupabaseClient,
  level: LocationLevel,
  parent: number | string | null,
): Promise<LocationOption[]> {
  try {
    const { data, error } = await supabase.rpc('location_children', { level, parent });
    if (!error && Array.isArray(data)) return sortByLocationName(data as LocationOption[]);
  } catch {}

  if (level === 'region') {
    const { data } = await supabase.from('regions').select('id,name').order('name', { ascending: true });
    return sortByLocationName((data ?? []) as LocationOption[]);
  }

  if (level === 'province') {
    if (parent == null) return [];
    const { data } = await supabase
      .from('provinces')
      .select('id,name')
      .eq('region_id', parent)
      .order('name', { ascending: true });
    return sortByLocationName((data ?? []) as LocationOption[]);
  }

  if (parent == null) return [];
  const { data } = await supabase
    .from('municipalities')
    .select('id,name')
    .eq('province_id', parent)
    .order('name', { ascending: true });
  return sortByLocationName((data ?? []) as LocationOption[]);
}
