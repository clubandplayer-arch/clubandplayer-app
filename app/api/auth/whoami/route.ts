// app/api/auth/whoami/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isAdminUser, isClubsAdminUser } from '@/lib/api/admin';

function resolveEnv() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';
  if (!url || !anon) throw new Error('Supabase env missing');
  return { url, anon };
}

function mergeCookies(from: NextResponse, into: NextResponse) {
  for (const c of from.cookies.getAll()) into.cookies.set(c);
  const set = from.headers.get('set-cookie');
  if (set) into.headers.append('set-cookie', set);
}

type Role = 'guest' | 'athlete' | 'club';
type ProfileStatus = 'pending' | 'active' | 'rejected';

function normRole(v: unknown): 'club' | 'athlete' | null {
  const s = (typeof v === 'string' ? v : '').trim().toLowerCase();
  if (s === 'club') return 'club';
  if (s === 'athlete') return 'athlete';
  return null;
}

function normStatus(v: unknown): ProfileStatus {
  const s = (typeof v === 'string' ? v : '').trim().toLowerCase();
  if (s === 'active' || s === 'rejected') return s;
  return 'pending';
}

export async function GET(req: NextRequest) {
  const carrier = new NextResponse();
  const { url, anon } = resolveEnv();

  const supabase = createServerClient(url, anon, {
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
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const out = NextResponse.json({
      user: null,
      role: 'guest' as const,
      profile: null,
    });
    mergeCookies(carrier, out);
    return out;
  }

  // 1) profiles.account_type (nuovo), 2) profiles.type (legacy)
  let accountType: 'club' | 'athlete' | null = null;
  let legacyType: string | null = null;
  let status: ProfileStatus = 'pending';

  let profileExists = false;

  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('account_type,type,status')
      .eq('user_id', user.id)
      .maybeSingle();

    profileExists = !!prof;
    accountType = normRole((prof as any)?.account_type);
    legacyType =
      typeof (prof as any)?.type === 'string'
        ? (prof as any)!.type.trim().toLowerCase()
        : null;
    status = normStatus((prof as any)?.status);

    if (!accountType) accountType = normRole(legacyType);
  } catch {
    // ignore
  }

  // 3) Fallback: metadati auth
  if (!accountType) {
    const meta = (user.user_metadata?.role ?? '')
      .toString()
      .toLowerCase();
    accountType = normRole(meta);
  }

  // 4) Fallback: se ha creato opportunità => club (legacy su created_by)
  if (!accountType) {
    try {
      const { count } = await supabase
        .from('opportunities')
        .select('id', { head: true, count: 'exact' })
        .eq('created_by', user.id);
      if ((count ?? 0) > 0) accountType = 'club';
    } catch {
      // ignore
    }
  }

  // 5) Auto-attivazione per email pre-approvate e creazione profilo se manca
  try {
    if (!status || typeof status !== 'string') status = 'pending';

    // crea il profilo se non esiste
    if (!profileExists) {
      const { data: created } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            display_name: user.user_metadata?.full_name || user.email || 'Profilo',
            account_type: accountType ?? null,
            role: accountType === 'club' ? 'Club' : null,
          },
          { onConflict: 'user_id' }
        )
        .select('account_type,type,status')
        .maybeSingle();

      if (created) {
        accountType = normRole((created as any)?.account_type) || accountType;
        legacyType = (created as any)?.type ?? legacyType;
        status = normStatus((created as any)?.status);
        profileExists = true;
      }
    }

    if (user.email) {
      const email = user.email.toLowerCase();
      const { data: preapproved } = await supabase
        .from('preapproved_emails')
        .select('role_hint')
        .eq('email', email)
        .maybeSingle();

      if (preapproved && status !== 'active') {
        const hintedRole = normRole((preapproved as any)?.role_hint);
        const updates: Record<string, any> = { status: 'active', updated_at: new Date().toISOString() };
        if (!accountType && hintedRole) updates.account_type = hintedRole;

        const { data: patched } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id)
          .select('account_type,type,status')
          .maybeSingle();

        if (patched) {
          accountType = normRole((patched as any)?.account_type) || accountType;
          legacyType = (patched as any)?.type ?? legacyType;
          status = normStatus((patched as any)?.status);
        } else {
          status = 'active';
          if (!accountType && hintedRole) accountType = hintedRole;
        }
      }
    }
  } catch {
    // non bloccare whoami
  }

  const role: Role = accountType ?? 'guest';
  const admin = await isAdminUser(supabase, user);
  const clubsAdmin = admin || (await isClubsAdminUser(supabase, user));

  if (admin) {
    try {
      await supabase
        .from('profiles')
        .update({ is_admin: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch {
      // ignora
    }
  }

  const out = NextResponse.json({
    user: { id: user.id, email: user.email ?? undefined },
    role,
    profile: { account_type: accountType, type: legacyType, status },
    clubsAdmin,
    admin,
  });
  mergeCookies(carrier, out);
  return out;
}