// app/(dashboard)/clubs/page.tsx
import ClubsClient from './ClubsClient';

export const metadata = {
  title: 'Clubs • ClubAndPlayer',
};

export default function Page() {
  return <ClubsClient />;
}
