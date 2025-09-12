// lib/api/auth.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export type AuthContext = {
  supabase: ServerSupabase;
  user: User;
};

/** Restituisce { ctx } se autenticato, altrimenti { res } con 401 */
export async function requireAuth(_req: NextRequest): Promise<
  | { ctx: AuthContext }
  | { res: NextResponse<{ error: string }> }
> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (error || !user) {
    return { res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ctx: { supabase, user } };
}

/** Wrapper comodo per i route handlers protetti */
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<Response> | Response
) {
  return async (req: NextRequest) => {
    const r = await requireAuth(req);
    if ('res' in r) return r.res;
    return handler(req, r.ctx);
  };
}
