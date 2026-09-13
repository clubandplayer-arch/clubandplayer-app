import { dbError, errorResponse, invalidPayload, notFoundResponse, successResponse } from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  MaterializedCompetitiveOptionRepository,
  SupabaseMaterializedCompetitiveOptionDataSource,
  type MaterializedCompetitiveOptionQuery,
  type MaterializedCompetitiveOptionResult,
} from '@/lib/taxonomy/materializedCompetitiveOptions.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Reader = { list(query: MaterializedCompetitiveOptionQuery): Promise<MaterializedCompetitiveOptionResult> };
type ReaderFactory = () => Promise<Reader>;
const noStore = (response: Response) => { response.headers.set('Cache-Control', 'no-store'); return response; };
const failure = (result: Exclude<MaterializedCompetitiveOptionResult, { status: 'ok' }>) => {
  switch (result.status) {
    case 'invalid_query': case 'invalid_scope': return invalidPayload('Parametri del catalogo non validi.');
    case 'unsupported_country': return notFoundResponse('Paese non disponibile.');
    case 'inactive_sport': return notFoundResponse('Sport non disponibile.');
    case 'unavailable_organization': return notFoundResponse('Organizzazione non disponibile.');
    case 'overflow': return errorResponse('INVALID_PAYLOAD', 'Il catalogo supera il limite richiesto.', { status: 409 });
  }
};

export function createCompetitiveOptionsGetHandler(createReader: ReaderFactory) {
  return async function competitiveOptionsGet(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const optional = ['disciplineId', 'variantId', 'asOf', 'limit'] as const;
    if (!params.get('countryId')?.trim() || !params.get('sportId')?.trim() || !params.get('organizationId')?.trim() ||
      optional.some((key) => params.has(key) && params.get(key)?.trim() === '')) return noStore(invalidPayload('Parametri del catalogo non validi.'));
    const query: MaterializedCompetitiveOptionQuery = {
      countryId: params.get('countryId')!, sportId: params.get('sportId')!, organizationId: params.get('organizationId')!,
      ...(params.has('disciplineId') ? { disciplineId: params.get('disciplineId')! } : {}),
      ...(params.has('variantId') ? { variantId: params.get('variantId')! } : {}),
      ...(params.has('asOf') ? { asOf: params.get('asOf')! } : {}),
      ...(params.has('limit') ? { limit: Number(params.get('limit')) } : {}),
    };
    try {
      const result = await (await createReader()).list(query);
      if (result.status !== 'ok') return noStore(failure(result));
      return noStore(successResponse({ organizationId: result.organizationId, options: result.options }));
    } catch { return noStore(dbError('Impossibile caricare le opzioni competitive.')); }
  };
}

export const GET = createCompetitiveOptionsGetHandler(async () => {
  const supabase = await getSupabaseServerClient();
  return new MaterializedCompetitiveOptionRepository(new SupabaseMaterializedCompetitiveOptionDataSource(supabase));
});
