import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const { data, error } = await supabase
    .from('ad_leads')
    .select('id,created_at,name,company,email,phone,location,budget,message,status,notes,source')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[admin/ads/leads] load error', error);
    return jsonError('Errore nel caricamento lead', 400);
  }

  return NextResponse.json({ data: data ?? [] });
});
