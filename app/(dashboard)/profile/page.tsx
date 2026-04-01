import { redirect } from 'next/navigation';
import { getUserAndRole } from '@/lib/auth/role';

export default async function LegacyProfileRedirect() {
  const { role } = await getUserAndRole();

  if (role === 'club') redirect('/club/profile');
  if (role === 'fan') redirect('/fan/profile');
  redirect('/player/profile');
}
