export const SPORTS_ORGANIZATION_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  lega_nazionale_dilettanti: 'LND',
  lega_calcio_a_8: 'Lega Calcio a 8',
  eifa: 'E.I.F.A.',
  csi: 'CSI',
  uisp: 'UISP',
  csen: 'CSEN',
  aics: 'AICS',
  opes: 'OPES',
  asc: 'ASC',
  endas: 'ENDAS',
  pgs: 'PGS',
  us_acli: 'US ACLI',
};

export function sportsOrganizationDisplayName(code: string | null | undefined, canonicalName: string): string {
  return (code && SPORTS_ORGANIZATION_DISPLAY_NAMES[code]) || canonicalName;
}
