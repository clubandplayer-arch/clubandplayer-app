import MessagesClient from './MessagesClient';

export const metadata = {
  title: 'Messaggi',
};

export default function MessagesPage() {
  return (
    <div className="page-shell">
      <MessagesClient />
    </div>
  );
}
