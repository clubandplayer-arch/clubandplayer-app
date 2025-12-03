import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Messaggi (legacy)',
};

type SearchParams = {
  to?: string;
};

export default function LegacyMessagesRedirect({ searchParams }: { searchParams?: SearchParams }) {
  const targetProfileId = typeof searchParams?.to === 'string' ? searchParams.to : null;
  if (targetProfileId) {
    redirect(`/messages/${targetProfileId}`);
  }

  redirect('/messages');
}
