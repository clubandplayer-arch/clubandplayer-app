// app/(dashboard)/feed/page.tsx
import FeedClient from '@/components/feed/FeedClient';

export const metadata = {
  title: 'Bacheca | Club&Player',
};

export default function FeedPage() {
  return (
    <main className="min-h-screen px-4 py-6 lg:px-8">
      <FeedClient />
    </main>
  );
}
