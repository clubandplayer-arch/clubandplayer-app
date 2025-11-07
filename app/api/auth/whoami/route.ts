import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'club' | 'athlete' | 'guest';

function normRole(input: any): 'club' | 'athlete' | null {
  if (!input) return null;
  const v = String(input).toLowerCase();
  if (v.includes('club')) return 'club';
  if (v.includes('athlete') || v.includes('player')) return 'athlete';
  return null;
}

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json(
      { user: null, role: 'guest' as Role, profile: null },
      { status: 200 }
    );
  }

  // Response temporanea per raccogliere eventuali Set-Cookie da Supabase
  const cookieResponse = new NextResponse();

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieResponse.cookies.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        cookieResponse.cookies.set(name, '', { ...options, maxAge: 0 });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const res = NextResponse.json(
      { user: null, role: 'guest' as Role, profile: null },
      { status: 200 }
    );
    // Propaga eventuali cookie
    for (const c of cookieResponse.cookies.getAll()) {
      res.cookies.set(c.name, c.value, {
        path: c.path,
        domain: c.domain,
        httpOnly: c.httpOnly,
        secure: c.secure,
        maxAge: c.maxAge,
        sameSite: c.sameSite,
      });
    }
    return res;
  }

  let accountType: 'club' | 'athlete' | null = null;
  let legacyType: string | null = null;

  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('account_type,type')
      .eq('id', user.id)
      .maybeSingle();

    accountType = normRole(prof?.account_type);
    legacyType =
      typeof prof?.type === 'string'
        ? prof.type.trim().toLowerCase()
        : null;

    if (!accountType) {
      accountType = normRole(legacyType);
    }
  } catch {
    // fallback sotto
  }

  if (!accountType) {
    accountType = normRole(user.user_metadata?.role);
  }

  const role: Role = accountType ?? 'guest';

  const res = NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email ?? undefined,
      },
      role,
      profile: {
        account_type: accountType,
        type: legacyType,
      },
    },
    { status: 200 }
  );

  // Propaga i cookie raccolti
  for (const c of cookieResponse.cookies.getAll()) {
    res.cookies.set(c.name, c.value, {
      path: c.path,
      domain: c.domain,
      httpOnly: c.httpOnly,
      secure: c.secure,
      maxAge: c.maxAge,
      sameSite: c.sameSite,
    });
  }

  return res;
}
