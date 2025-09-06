// app/(dashboard)/clubs/page.tsx
import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Clubs • ClubAndPlayer',
};

// Carico il client component solo sul client
const ClubsClient = dynamic(() => import('./ClubsClient'), { ssr: false });

export default function Page() {
  return <ClubsClient />;
}
