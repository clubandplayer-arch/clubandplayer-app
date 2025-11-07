// components/profiles/ProfileMiniCard.tsx
import Link from 'next/link';

type ProfileMini = {
  account_type?: 'club' | 'athlete' | string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export default function ProfileMiniCard({ profile }: { profile?: ProfileMini | null }) {
  const name =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    'Profilo';

  const subtitle =
    profile?.account_type === 'club'
      ? 'Club'
      : profile?.account_type === 'athlete'
        ? 'Atleta'
        : '';

  const avatarUrl = profile?.avatar_url || null;
  const initial = name.charAt(0).toUpperCase();

  return (
    <Link
      href="/profile"
      className="flex items-center gap-3 rounded-2xl border px-3 py-2 hover:bg-gray-50"
    >
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{name}</span>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>
    </Link>
  );
}
