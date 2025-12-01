import MessagesClient from './MessagesClient';

export const metadata = {
  title: 'Messaggi',
};

type SearchParams = {
  conversationId?: string;
  conversation?: string;
  to?: string;
};

export default function MessagesPage({ searchParams }: { searchParams?: SearchParams }) {
  const conversationId =
    typeof searchParams?.conversationId === 'string'
      ? searchParams.conversationId
      : typeof searchParams?.conversation === 'string'
      ? searchParams.conversation
      : null;
  const targetProfileId = typeof searchParams?.to === 'string' ? searchParams.to : null;

  return (
    <div className="page-shell">
      <MessagesClient
        initialConversationId={conversationId}
        initialTargetProfileId={targetProfileId}
      />
    </div>
  );
}
