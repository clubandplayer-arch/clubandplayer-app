// lib/api/auth.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Alias tipato sul client server-side che usi davvero
type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export type AuthContext = {
  supabase: ServerSupabase;
  user: User;
};

/** Helper usato da molti endpoint */
export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: message, ...(extra ?? {}) },
    { status }
  );
}

function resolveBearerToken(req: NextRequest): string | null {
  const authorization = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  const trimmed = token.trim();
  return trimmed ? trimmed : null;
}

/** Restituisce { ctx } se autenticato, altrimenti { res } con 401 */
export async function requireAuth(req: NextRequest): Promise<
  | { ctx: AuthContext }
  | { res: NextResponse<{ error: string }> }
> {
  const supabase = await getSupabaseServerClient();

  const byCookie = await supabase.auth.getUser();
  const cookieUser = byCookie.data?.user ?? null;
  if (!byCookie.error && cookieUser) {
    return { ctx: { supabase, user: cookieUser } };
  }

  const bearerToken = resolveBearerToken(req);
  if (bearerToken) {
    const byBearer = await supabase.auth.getUser(bearerToken);
    const bearerUser = byBearer.data?.user ?? null;
    if (!byBearer.error && bearerUser) {
      return { ctx: { supabase, user: bearerUser } };
    }
  }

  return { res: jsonError('Unauthorized', 401) };
}

/** Wrapper comodo per i route handlers protetti */
export function withAuth(
  handler: (
    req: NextRequest,
    ctx: AuthContext,
    routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ) => Promise<Response> | Response
) {
  return async (
    req: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ) => {
    const r = await requireAuth(req);
    if ('res' in r) return r.res;
    return handler(req, r.ctx, routeContext);
  };
}
