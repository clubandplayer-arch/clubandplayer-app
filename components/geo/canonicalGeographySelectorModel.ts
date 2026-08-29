import type { GeoAreaRead } from '@/lib/geo/areas';
import type { CanonicalCountryRead } from '@/lib/geo/countryCatalog';
import type { CanonicalGeographyLoader } from './canonicalGeographyContracts';

export type CanonicalGeographyLevel = { options: GeoAreaRead[]; selectedId: string | null };

export async function loadCanonicalHierarchy(
  loader: CanonicalGeographyLoader,
  country: CanonicalCountryRead,
  geoAreaId: string | null,
  signal?: AbortSignal,
): Promise<CanonicalGeographyLevel[]> {
  const roots = await loader.roots(country.iso2, signal);
  if (!geoAreaId) return [{ options: roots, selectedId: null }];
  const { area, ancestors } = await loader.ancestry(geoAreaId, signal);
  const path = [...ancestors, area];
  if (!path.length || path.some((item) => item.country_id !== country.id)) throw new Error('L’area selezionata non appartiene al Paese scelto');
  if (!roots.some((root) => root.id === path[0].id)) throw new Error('Gerarchia geografica iniziale incoerente');
  const levels: CanonicalGeographyLevel[] = [{ options: roots, selectedId: path[0].id }];
  for (let index = 0; index < path.length - 1; index += 1) {
    const options = await loader.children(country.iso2, path[index].id, signal);
    if (!options.some((option) => option.id === path[index + 1].id)) throw new Error('Gerarchia geografica iniziale incoerente');
    levels.push({ options, selectedId: path[index + 1].id });
  }
  const children = await loader.children(country.iso2, area.id, signal);
  if (children.length) levels.push({ options: children, selectedId: null });
  return levels;
}

export function applyCanonicalLevelSelection(levels: CanonicalGeographyLevel[], index: number, nextId: string | null) {
  const retained = levels.slice(0, index + 1).map((level, levelIndex) => ({ ...level, selectedId: levelIndex === index ? nextId : level.selectedId }));
  return { levels: retained, value: nextId ?? (index > 0 ? retained[index - 1].selectedId : null) };
}
