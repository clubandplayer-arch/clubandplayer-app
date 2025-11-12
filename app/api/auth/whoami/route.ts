import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

function env(key: 'URL' | 'ANON_KEY') {
  const keys = key === 'URL'
    ? ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']
    : ['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  return '';
}

export async function GET(_req: NextRequest) {
  const supabaseUrl = env('URL');
  const supabaseKey = env('ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ user: null, profile: null });
  }

  const cookieStore = cookies();
  const res = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
        if (options?.maxAge) parts.push(`Max-Age=${options.maxAge}`);
        res.headers.append('set-cookie', parts.join('; '));
      },
      remove(name: string) {
        res.headers.append('set-cookie', `${name}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null, profile: null });

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, profile_type, type')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(
    { user: { id: user.id, email: user.email }, profile },
    { headers: res.headers },
  );
}
