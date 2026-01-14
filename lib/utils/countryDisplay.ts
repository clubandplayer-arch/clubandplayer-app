import { countryLabel } from '@/lib/utils/country';
import { iso2ToFlagEmoji } from '@/lib/utils/flags';

export type CountryDisplay = {
  flag: string | null;
  label: string;
};

export function getCountryDisplay(value?: string | null): CountryDisplay {
  const info = countryLabel(value);
  if (!info.label) return { flag: null, label: '' };
  const flag = info.iso ? iso2ToFlagEmoji(info.iso) : null;
  return { flag, label: info.label };
}
