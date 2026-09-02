import NetworkPage from '@/components/network/NetworkPage';
import { buildLocalizedMetadata } from '@/lib/i18n/metadata';
import { resolveRequestLocale } from '@/lib/i18n/server';

export async function generateMetadata() {
  return buildLocalizedMetadata(await resolveRequestLocale(), 'network', '/network');
}

export default function NetworkRoute() {
  return (
    <div className="page-shell">
      <NetworkPage />
    </div>
  );
}
