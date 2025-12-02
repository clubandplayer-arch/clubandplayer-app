export const metadata = {
  title: 'Messaggi',
};

export default function MessagesLanding() {
  return (
    <div className="page-shell">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Messaggi diretti</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Apri un profilo e clicca “Messaggia” per iniziare una chat 1-a-1. Questo spazio mostrerà
          la conversazione su <code>/messages/&lt;profileId&gt;</code>.
        </p>
      </div>
    </div>
  );
}
