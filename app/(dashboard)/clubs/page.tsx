// app/(dashboard)/clubs/page.tsx
import ClubsClient from './ClubsClient';
import { isClubsReadOnly } from '@/lib/env/features';

export const dynamic = 'force-static';

export default function Page() {
  return <ClubsClient readOnly={isClubsReadOnly()} />;
}
