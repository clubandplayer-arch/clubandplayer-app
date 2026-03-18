export type ProvinceAbbreviationMap = Record<string, string>;

export function normalizeProvinceName(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

export function provinceDisplayValue(
  province: string | null | undefined,
  abbreviations?: ProvinceAbbreviationMap | null,
) {
  const currentValue = (province ?? '').trim();
  if (!currentValue) return '';
  const sigla = abbreviations?.[normalizeProvinceName(currentValue)]?.trim();
  return sigla || currentValue;
}
