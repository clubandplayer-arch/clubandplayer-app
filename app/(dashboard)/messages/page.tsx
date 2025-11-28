import MessagesClient from './MessagesClient';

export const metadata = {
  title: 'Messaggi',
};

export default function MessagesPage() {
  return (
    <div className="p-4 md:p-6">
      <MessagesClient />
    </div>
  );
}
