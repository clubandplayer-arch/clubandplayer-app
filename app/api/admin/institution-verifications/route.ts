import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
const STATUS_VALUES = new Set(['draft', 'submitted', 'approved', 'rejected']);

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);
  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);
  const url = new URL(req.url);
  const status = (url.searchParams.get('status') || '').trim().toLowerCase();
  const statusFilter = STATUS_VALUES.has(status) ? status : null;
  let query = adminClient
    .from('institution_verification_requests')
    .select('id,institution_id,entity_type,entity_name,fiscal_code,vat_number,email,pec,website,representative,document_type,status,submitted_at,verified_until,created_at,rejection_reason')
    .order('created_at', { ascending: false });
  if (statusFilter) query = query.eq('status', statusFilter);
  const { data, error } = await query;
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: data ?? [] });
});
