export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function LogoutPage() {
  try {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Anche se Supabase non risponde, proseguiamo verso signup.
  }
  redirect('/signup');
}
