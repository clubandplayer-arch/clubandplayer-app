import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getInstitutionContext } from '@/app/api/institution/verification/utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none ring-[var(--brand)] focus:ring-2';
}

export default async function InstitutionProfilePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=%2Finstitution%2Fprofile');
  const ctx = await getInstitutionContext(supabase, auth.user.id).catch(() => null);
  if (!ctx) redirect('/feed');
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name,display_name,headline,bio,avatar_url,city,province,region,country')
    .eq('id', ctx.profileId)
    .maybeSingle();
  const params = (await searchParams) ?? {};

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="heading-h1">Modifica profilo Ente</h1>
        <p className="text-sm text-neutral-600">Aggiorna le informazioni pubbliche del tuo Ente.</p>
      </header>
      {params.saved ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Profilo aggiornato.</div> : null}
      {params.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{String(params.error)}</div> : null}
      <form action="/institution/profile/submit" method="post" className="grid gap-4 rounded-2xl border bg-white/80 p-5 shadow-sm">
        <label className="block text-sm font-medium text-neutral-700">Nome ente
          <input name="full_name" required defaultValue={profile?.full_name ?? profile?.display_name ?? ''} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Headline
          <input name="headline" defaultValue={profile?.headline ?? ''} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Bio
          <textarea name="bio" rows={5} defaultValue={profile?.bio ?? ''} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Avatar URL
          <input name="avatar_url" type="url" defaultValue={profile?.avatar_url ?? ''} className={fieldClass()} />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-700">Città<input name="city" defaultValue={profile?.city ?? ''} className={fieldClass()} /></label>
          <label className="block text-sm font-medium text-neutral-700">Provincia<input name="province" defaultValue={profile?.province ?? ''} className={fieldClass()} /></label>
          <label className="block text-sm font-medium text-neutral-700">Regione<input name="region" defaultValue={profile?.region ?? ''} className={fieldClass()} /></label>
          <label className="block text-sm font-medium text-neutral-700">Paese<input name="country" defaultValue={profile?.country ?? ''} className={fieldClass()} /></label>
        </div>
        <button type="submit" className="w-fit rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">Salva profilo</button>
      </form>
    </main>
  );
}
