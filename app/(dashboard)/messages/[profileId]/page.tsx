import { notFound } from 'next/navigation';
import { DirectMessageThread } from '@/components/messaging/DirectMessageThread';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/api/profile';

export const metadata = {
  title: 'Chat diretta',
};

export const dynamic = 'force-dynamic';

const emailRegex = /\S+@\S+\.\S+/;

function cleanName(value?: string | null) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return null;
  if (emailRegex.test(trimmed)) return null;
  return trimmed;
}

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

  const title =
    cleanName(targetProfile.full_name) ||
    cleanName(targetProfile.display_name) ||
    'Senza nome';

  return (
    <div className="page-shell">
      <DirectMessageThread
        targetProfileId={targetProfile.id}
        targetDisplayName={title}
        targetAvatarUrl={targetProfile.avatar_url}
      />
    </div>
  );
}
