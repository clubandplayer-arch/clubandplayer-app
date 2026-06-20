import Image from 'next/image';
import { notFound } from 'next/navigation';

import PublicAuthorFeed from '@/components/feed/PublicAuthorFeed';
import { buildProfileDisplayName } from '@/lib/displayName';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type PageProps = { params: Promise<{ id: string }> };

type AdminProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  account_type: string | null;
  type: string | null;
  is_admin: boolean | null;
  club_foundation_year: number | null;
};

function initialsFromName(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return 'PA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default async function AdminPublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id,user_id,full_name,display_name,headline,bio,avatar_url,account_type,type,is_admin,club_foundation_year')
    .eq('id', id)
    .maybeSingle();

  const profile = (data ?? null) as AdminProfileRow | null;
  const accountType = String(profile?.account_type ?? profile?.type ?? '').toLowerCase();
  if (!profile || (accountType !== 'admin' && profile.is_admin !== true)) notFound();

  const displayName = buildProfileDisplayName(profile.full_name, profile.display_name, 'Platform Admin');
  const initials = initialsFromName(displayName);
  const aboutText = profile.bio || 'Profilo amministratore della piattaforma Club & Player.';

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 p-4 md:p-6">
      <header className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className="relative h-28 w-28 shrink-0 md:h-32 md:w-32">
            <div className="h-full w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-white/60">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={displayName} fill sizes="128px" className="rounded-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-slate-200 text-xl font-semibold text-sky-800">
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-logo text-2xl font-normal leading-tight text-neutral-900 md:text-3xl">{displayName}</h1>
                <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold leading-tight text-sky-800 ring-1 ring-inset ring-sky-200">
                  Admin
                </span>
              </div>
              <p className="text-sm font-medium text-neutral-700 md:text-base">{profile.headline || 'Platform Admin'}</p>
              {profile.club_foundation_year ? (
                <p className="text-xs font-medium text-neutral-500">Anno progetto: {profile.club_foundation_year}</p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="heading-h2 text-xl">Biografia</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{aboutText}</p>
      </section>

      <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="heading-h2 text-xl">Bacheca</h2>
          <span className="text-xs font-semibold text-blue-700">Aggiornamenti admin</span>
        </div>
        <PublicAuthorFeed authorId={profile.id} fallbackAuthorIds={profile.user_id ? [profile.user_id] : []} />
      </section>
    </div>
  );
}
