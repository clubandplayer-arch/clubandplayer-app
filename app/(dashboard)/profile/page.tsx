'use client';

import ProfileEditForm from '@/components/profiles/ProfileEditForm';

export default function ProfilePage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Il mio profilo atleta</h1>
      <p className="text-sm text-gray-600">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>
      <ProfileEditForm />
    </div>
  );
}
