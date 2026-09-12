import { dbError, errorResponse, invalidPayload, notFoundResponse, successResponse } from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  MaterializedSportsOrganizationRepository,
  SupabaseMaterializedSportsOrganizationDataSource,
  type MaterializedSportsOrganizationQuery,
  type MaterializedSportsOrganizationResult,
} from '@/lib/taxonomy/materializedSportsOrganizations.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Reader = { list(query: MaterializedSportsOrganizationQuery): Promise<MaterializedSportsOrganizationResult> };
type ReaderFactory = () => Promise<Reader>;
const noStore = (response: Response) => { response.headers.set('Cache-Control', 'no-store'); return response; };

const failure = (result: Exclude<MaterializedSportsOrganizationResult, { status: 'ok' }>) => {
  switch (result.status) {
    case 'invalid_query':
    case 'invalid_scope': return invalidPayload('Parametri del catalogo non validi.');
    case 'unsupported_country': return notFoundResponse('Paese non disponibile.');
    case 'inactive_sport': return notFoundResponse('Sport non disponibile.');
    case 'overflow': return errorResponse('INVALID_PAYLOAD', 'Il catalogo supera il limite richiesto.', { status: 409 });
  }
};

export function createSportsOrganizationsGetHandler(createReader: ReaderFactory) {
  return async function sportsOrganizationsGet(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const optional = ['disciplineId', 'variantId', 'asOf', 'limit'] as const;
    if (!params.get('countryId')?.trim() || !params.get('sportId')?.trim() ||
      optional.some((key) => params.has(key) && params.get(key)?.trim() === '')) {
      return noStore(invalidPayload('Parametri del catalogo non validi.'));
    }
    const query: MaterializedSportsOrganizationQuery = {
      countryId: params.get('countryId') ?? '', sportId: params.get('sportId') ?? '',
      ...(params.has('disciplineId') ? { disciplineId: params.get('disciplineId')! } : {}),
      ...(params.has('variantId') ? { variantId: params.get('variantId')! } : {}),
      ...(params.has('asOf') ? { asOf: params.get('asOf')! } : {}),
      ...(params.has('limit') ? { limit: Number(params.get('limit')) } : {}),
    };
    try {
      const result = await (await createReader()).list(query);
      if (result.status !== 'ok') return noStore(failure(result));
      return noStore(successResponse({ derivation: result.derivation, organizations: result.organizations }));
    } catch {
      return noStore(dbError('Impossibile caricare le organizzazioni sportive.'));
    }
  };
}

export const GET = createSportsOrganizationsGetHandler(async () => {
  const supabase = await getSupabaseServerClient();
  return new MaterializedSportsOrganizationRepository(new SupabaseMaterializedSportsOrganizationDataSource(supabase));
});
