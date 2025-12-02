import { notFound } from 'next/navigation';
import { DirectMessageThread } from './DirectMessageThread';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/api/profile';

export const metadata = {
  title: 'Chat diretta',
};

export const dynamic = 'force-dynamic';

export default async function DirectMessagesPage({ params }: { params: { profileId?: string } }) {
  const rawId = params?.profileId;
  const profileId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : null;
  if (!profileId) notFound();

  const supabase = await getSupabaseServerClient();
  let targetProfile: Awaited<ReturnType<typeof getProfileById>> | null = null;
  try {
    targetProfile = await getProfileById(supabase, profileId);
  } catch (error) {
    console.error('[messages page] errore caricamento profilo', error);
  }

  if (!targetProfile) notFound();

  return (
    <div className="page-shell">
      <DirectMessageThread
        targetProfileId={targetProfile.id}
        targetDisplayName={targetProfile.display_name || 'Profilo'}
        targetAvatarUrl={targetProfile.avatar_url}
      />
    </div>
  );
}
