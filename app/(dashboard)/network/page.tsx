import NetworkPage from '@/components/network/NetworkPage';

export const metadata = {
  title: 'La tua rete',
};

export default function NetworkRoute() {
  return (
    <div className="p-4 md:p-6">
      <NetworkPage />
    </div>
  );
}
