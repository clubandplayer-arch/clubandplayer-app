import NetworkPage from '@/components/network/NetworkPage';

export const metadata = {
  title: 'La tua rete',
};

export default function NetworkRoute() {
  return (
    <div className="page-shell">
      <NetworkPage />
    </div>
  );
}
