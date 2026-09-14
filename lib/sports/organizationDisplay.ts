export function sportsOrganizationDisplayName(code: string | null | undefined, canonicalName: string): string {
  const shortNames: Record<string, string> = {
    lega_nazionale_dilettanti: 'LND',
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
  return (code && shortNames[code]) || canonicalName;
}
