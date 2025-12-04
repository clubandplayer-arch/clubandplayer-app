import { DirectMessageInbox } from '@/components/messaging/DirectMessageInbox';

export const metadata = {
  title: 'Messaggi',
};

export const dynamic = 'force-dynamic';

export default function MessagesLanding() {
  return (
    <div className="page-shell">
      <DirectMessageInbox />
    </div>
  );
}
