import OpportunityDetailClient from '@/components/opportunities/OpportunityDetailClient';

export default function OpportunityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <OpportunityDetailClient id={params.id} />;
}
