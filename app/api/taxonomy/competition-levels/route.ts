import { dbError, errorResponse, invalidPayload, notFoundResponse, successResponse } from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  CountryCompetitionLevelRepository,
  SupabaseCompetitionLevelDataSource,
  type CompetitionLevelQuery,
  type CompetitionLevelQueryResult,
} from '@/lib/taxonomy/countryCompetitionLevels.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type CompetitionLevelReader = {
  list(query: CompetitionLevelQuery): Promise<CompetitionLevelQueryResult>;
};

type CompetitionLevelReaderFactory = () => Promise<CompetitionLevelReader>;

const noStore = (response: Response): Response => {
  response.headers.set('Cache-Control', 'no-store');
  return response;
};

const queryFailureResponse = (result: Exclude<CompetitionLevelQueryResult, { status: 'ok' }>): Response => {
  switch (result.status) {
    case 'invalid_query':
      return invalidPayload('Parametri del catalogo non validi.');
    case 'unsupported_country':
      return notFoundResponse('Paese non disponibile.');
    case 'inactive_sport':
      return notFoundResponse('Sport non disponibile.');
    case 'organization_not_in_country':
      return notFoundResponse('Organizzazione non disponibile per il Paese selezionato.');
    case 'overflow':
      return errorResponse('INVALID_PAYLOAD', 'Il catalogo supera il limite richiesto.', { status: 409 });
  }
};

export function createCompetitionLevelsGetHandler(createReader: CompetitionLevelReaderFactory) {
  return async function competitionLevelsGet(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const countryId = params.get('countryId') ?? '';
    const sportId = params.get('sportId') ?? '';
    const organizationId = params.get('organizationId');
    const asOf = params.get('asOf');
    const rawLimit = params.get('limit');

    if (organizationId !== null && organizationId.trim() === '') {
      return noStore(invalidPayload('Parametri del catalogo non validi.'));
    }

    const query: CompetitionLevelQuery = {
      countryId,
      sportId,
      ...(organizationId !== null ? { organizationId } : {}),
      ...(asOf !== null ? { asOf } : {}),
      ...(rawLimit !== null ? { limit: Number(rawLimit) } : {}),
    };

    try {
      const reader = await createReader();
      const result = await reader.list(query);
      if (result.status !== 'ok') return noStore(queryFailureResponse(result));
      return noStore(successResponse({ options: result.options }));
    } catch {
      return noStore(dbError('Impossibile caricare i livelli competitivi.'));
    }
  };
}

export const GET = createCompetitionLevelsGetHandler(async () => {
  const supabase = await getSupabaseServerClient();
  return new CountryCompetitionLevelRepository(new SupabaseCompetitionLevelDataSource(supabase));
});
