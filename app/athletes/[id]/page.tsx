import { redirect } from 'next/navigation';

export default function LegacyAthleteRedirect({ params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) redirect('/');
  redirect(`/players/${id}`);
}
