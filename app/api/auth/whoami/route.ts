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

<<<<<<< HEAD
export async function GET(_req: NextRequest) {
  // In questa versione di Next cookies() è async → usiamo await
  const cookieStore = await cookies();
=======
function resolveEnv(key: 'URL' | 'ANON_KEY') {
  const envKey = key === 'URL' ? 'SUPABASE_URL' : 'SUPABASE_ANON_KEY';
  const publicKey = key === 'URL' ? 'NEXT_PUBLIC_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
  const direct = process.env[envKey];
  if (direct) return direct;
  const fallback = process.env[publicKey];
  if (fallback) return fallback;
  return null;
}

function mergeCookies(from: NextResponse, into: NextResponse) {
  for (const c of from.cookies.getAll()) into.cookies.set(c);
  const set = from.headers.get('set-cookie');
  if (set) into.headers.append('set-cookie', set);
}
>>>>>>> codex/verify-repository-correctness

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

<<<<<<< HEAD
  if (!supabaseUrl || !supabaseKey) {
    const res: WhoAmIResponse = {
      user: null,
      role: 'guest',
    };
    return NextResponse.json(res);
=======
  const supabaseUrl = resolveEnv('URL');
  const supabaseAnon = resolveEnv('ANON_KEY');

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ user: null, role: 'guest' as const, profile: null });
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          carrier.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          carrier.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const out = NextResponse.json({ user: null, role: 'guest' as const });
    mergeCookies(carrier, out);
    return out;
>>>>>>> codex/verify-repository-correctness
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
<<<<<<< HEAD
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
=======
    .select('account_type, type, profile_type')
    .eq('user_id', user.id)
    .maybeSingle();

  const raw =
    (prof?.account_type ?? prof?.type ?? prof?.profile_type ?? '')
      .toString()
      .toLowerCase();
  const role: 'club' | 'athlete' | 'guest' =
    raw.startsWith('club') ? 'club' : raw.startsWith('athlet') ? 'athlete' : 'guest';
>>>>>>> codex/verify-repository-correctness

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
<<<<<<< HEAD
  };

  return NextResponse.json(res);
=======
    profile: {
      account_type: raw || null,
    },
  });
  mergeCookies(carrier, out);
  return out;
>>>>>>> codex/verify-repository-correctness
}
