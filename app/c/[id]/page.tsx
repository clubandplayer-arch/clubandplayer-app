import { redirect } from 'next/navigation';

export default async function LegacyClubProfileRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/clubs/${id}`);
}
