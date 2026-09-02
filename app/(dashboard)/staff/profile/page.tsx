import ProfileEditForm from '@/components/profiles/ProfileEditForm';
import { resolveRequestLocale } from '@/lib/i18n/server';
import { loadMessages } from '@/lib/i18n/messages';

export default async function StaffProfilePage() {
  const messages = await loadMessages(await resolveRequestLocale());
  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{messages['profile.myStaff']}</h1>
      <p className="text-sm text-gray-600">
        {messages['profile.matchingHelp']}
      </p>
      <ProfileEditForm />
    </div>
  );
}
