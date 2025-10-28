'use client';

import ProfileHeader from '@/components/profiles/ProfileHeader';
import ProfileEditForm from '@/components/profiles/ProfileEditForm';

export default function ProfilePage() {
  return (
    <main className="container mx-auto py-6 space-y-6">
      <ProfileHeader />       {/* titolo dinamico */}
      <ProfileEditForm />
    </main>
  );
}
