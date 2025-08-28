import { Filters } from '@/lib/schemas/filters.schema';
import { OpportunityDTO } from '@/lib/schemas/opportunity.schema';
import { ClubDTO } from '@/lib/schemas/club.schema';
import { SavedViewDTO } from '@/lib/schemas/savedView.schema';


function qs(params: Record<string, unknown>) {
const sp = new URLSearchParams();
Object.entries(params).forEach(([k, v]) => {
if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return;
if (Array.isArray(v)) sp.set(k, v.join(','));
else sp.set(k, String(v));
});
const s = sp.toString();
return s ? `?${s}` : '';
}


export async function getOpportunities(filters: Partial<Filters> & { page?: number }) {
const res = await fetch(`/api/opportunities${qs(filters)}`, { cache: 'no-store' });
if (!res.ok) throw new Error('Failed');
const json = await res.json();
return json as { items: OpportunityDTO[]; page: number; pageSize: number; total: number; hasMore: boolean };
}


export async function getClubs(filters: Partial<Filters>) {
const res = await fetch(`/api/clubs${qs(filters)}`, { cache: 'no-store' });
if (!res.ok) throw new Error('Failed');
const json = await res.json();
return json as { items: ClubDTO[]; page: number; pageSize: number; total: number; hasMore: boolean };
}


export async function getSavedViews() {
const res = await fetch('/api/views', { cache: 'no-store' });
if (!res.ok) throw new Error('Failed');
return (await res.json()) as SavedViewDTO[];
}


export async function deleteSavedView(id: string) {
const res = await fetch(`/api/views/${id}`, { method: 'DELETE' });
if (!res.ok) throw new Error('Failed');
return true;
}