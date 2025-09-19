// app/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

async function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const store = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        store.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        store.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
    cookieOptions: { sameSite: 'lax' },
  });
}

export default async function Home() {
  const supabase = await getSupabase();

  // chi è loggato?
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;

  if (!userId) {
    // guest → feed
    redirect('/feed');
  }

  // club?
  try {
    const { data: club } = await supabase
      .from('clubs')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (club?.id) {
      redirect('/club/profile');
    }
  } catch {
    // ignore
  }

  // atleta?
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id,type')
      .eq('id', userId)
      .maybeSingle();

    if (String(prof?.type ?? '').toLowerCase() === 'athlete') {
      redirect('/profile');
    }
  } catch {
    // ignore
  }

  // fallback
  redirect('/onboarding');
}
