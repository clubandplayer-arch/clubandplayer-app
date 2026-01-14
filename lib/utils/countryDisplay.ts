import { countryLabel } from '@/lib/utils/country';
import { countryCodeToFlagEmoji } from '@/lib/utils/flags';

export type CountryDisplay = {
  flag: string | null;
  label: string;
};

export function getCountryDisplay(value?: string | null): CountryDisplay {
  const info = countryLabel(value);
  if (!info.label) return { flag: null, label: '' };
  const flag = info.iso ? countryCodeToFlagEmoji(info.iso) : null;
  return { flag, label: info.label };
}
