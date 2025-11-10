import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WhoAmIResponse = {
  user: {
    id: string;
    email: string | null;
  } | null;
  role: 'guest' | 'athlete' | 'club';
};

export async function GET(_req: NextRequest) {
  // In questa versione di Next cookies() è async → usiamo await
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const res: WhoAmIResponse = {
      user: null,
      role: 'guest',
    };
    return NextResponse.json(res);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', { ...options, maxAge: 0 });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const res: WhoAmIResponse = {
      user: null,
      role: 'guest',
    };
    return NextResponse.json(res);
  }

  // Recupera il profilo per determinare il ruolo
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, profile_type, type')
    .eq('user_id', user.id)
    .maybeSingle();

  const rawType = (
    profile?.account_type ??
    profile?.profile_type ??
    profile?.type ??
    ''
  )
    .toString()
    .toLowerCase();

  let role: 'guest' | 'athlete' | 'club' = 'guest';

  if (rawType.startsWith('club')) {
    role = 'club';
  } else if (rawType.startsWith('athlet')) {
    role = 'athlete';
  }

  const res: WhoAmIResponse = {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    role,
  };

  return NextResponse.json(res);
}
