export type I18nRouteType = 'USER-FACING' | 'LEGACY REDIRECT' | 'ADMIN' | 'REGISTRY' | 'VERIFICATION' | 'LEGAL' | 'API/SERVER';
export type I18nRouteInventoryItem = { file: string; route: string; type: I18nRouteType };

const LEGACY_REDIRECTS = new Set([
  'app/(dashboard)/messages/legacy/page.tsx', 'app/(dashboard)/page.tsx',
  'app/(dashboard)/profile/page.tsx', 'app/athletes/[id]/page.tsx',
  'app/c/[id]/page.tsx', 'app/u/[id]/page.tsx', 'app/page.tsx',
]);

export function appPageFileToRoute(file: string): string {
  const normalized = file.replaceAll('\\', '/').replace(/^\.\//, '');
  const withoutApp = normalized.replace(/^app\//, '').replace(/\/page\.tsx$/, '');
  const segments = withoutApp.split('/').filter((segment) => segment && !/^\(.+\)$/.test(segment));
  return segments.length ? `/${segments.join('/')}` : '/';
}

export function classifyAppRouterFile(file: string): I18nRouteType {
  const normalized = file.replaceAll('\\', '/').replace(/^\.\//, '');
  if (normalized.startsWith('app/api/') || normalized.includes('/route.')) return 'API/SERVER';
  if (LEGACY_REDIRECTS.has(normalized)) return 'LEGACY REDIRECT';
  if (normalized.startsWith('app/admin/') || normalized.includes('/admin/')) return 'ADMIN';
  if (normalized.includes('/registry') || normalized.includes('registry-')) return 'REGISTRY';
  if (normalized.includes('/verification') || normalized.includes('verifications')) return 'VERIFICATION';
  if (normalized.startsWith('app/legal/')) return 'LEGAL';
  if (normalized.startsWith('app/debug/')) return 'API/SERVER';
  return 'USER-FACING';
}
