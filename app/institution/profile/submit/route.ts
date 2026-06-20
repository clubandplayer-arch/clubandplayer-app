import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { getInstitutionContext } from '@/app/api/institution/verification/utils';

const clean = (v: unknown) => String(v ?? '').trim();
const redirectBack = (req: NextRequest, params: Record<string, string>) => {
  const url = new URL('/institution/profile', req.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, 303);
};

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const ctx = await getInstitutionContext(supabase, user.id).catch(() => null);
  if (!ctx) return redirectBack(req, { error: 'Operazione disponibile solo per il ruolo Ente' });
  const formData = await req.formData().catch(() => null);
  if (!formData) return redirectBack(req, { error: 'Payload non valido' });
  const fullName = clean(formData.get('full_name'));
  if (!fullName) return redirectBack(req, { error: 'Nome ente obbligatorio' });
  const updates = {
    full_name: fullName,
    display_name: fullName,
    headline: clean(formData.get('headline')) || null,
    bio: clean(formData.get('bio')) || null,
    avatar_url: clean(formData.get('avatar_url')) || null,
    city: clean(formData.get('city')) || null,
    province: clean(formData.get('province')) || null,
    region: clean(formData.get('region')) || null,
    country: clean(formData.get('country')) || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('profiles').update(updates).eq('id', ctx.profileId);
  if (error) return redirectBack(req, { error: error.message });
  return redirectBack(req, { saved: '1' });
});
