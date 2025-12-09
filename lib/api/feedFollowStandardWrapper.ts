import {
  dbError as standardDbError,
  invalidPayload as standardInvalidPayload,
  notAuthenticated as standardNotAuthenticated,
  notAuthorized as standardNotAuthorized,
  notFoundResponse as standardNotFoundResponse,
  rateLimited as standardRateLimited,
  rlsDenied as standardRlsDenied,
  successResponse as standardSuccessResponse,
  unknownError as standardUnknownError,
} from '@/lib/api/standardResponses';
import {
  dbError as legacyDbError,
  notAuthenticated as legacyNotAuthenticated,
  notAuthorized as legacyNotAuthorized,
  notFoundError as legacyNotFoundError,
  notReady as legacyNotReady,
  rateLimited as legacyRateLimited,
  rlsDenied as legacyRlsDenied,
  successResponse as legacySuccessResponse,
  unknownError as legacyUnknownError,
  validationError as legacyValidationError,
} from '@/lib/api/feedFollowResponses';

function safeTap(fn: () => void) {
  try {
    fn();
  } catch (error) {
    console.error('[feed/follow] standardResponses tap failed', error);
  }
}

export function successResponse<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  safeTap(() => standardSuccessResponse(data, init));
  return legacySuccessResponse(data, init);
}

export function validationError(message: string, details?: unknown) {
  safeTap(() => standardInvalidPayload(message, details));
  return legacyValidationError(message, details);
}

export function notAuthenticated(message = 'Utente non autenticato') {
  safeTap(() => standardNotAuthenticated(message));
  return legacyNotAuthenticated(message);
}

export function notAuthorized(message = 'Operazione non consentita') {
  safeTap(() => standardNotAuthorized(message));
  return legacyNotAuthorized(message);
}

export function notFoundError(message = 'Risorsa non trovata') {
  safeTap(() => standardNotFoundResponse(message));
  return legacyNotFoundError(message);
}

export function rateLimited(message = 'Rate limit attivo', details?: unknown) {
  safeTap(() => standardRateLimited(message));
  return legacyRateLimited(message, details);
}

export function rlsDenied(message = 'Accesso negato dalle policy RLS') {
  safeTap(() => standardRlsDenied(message));
  return legacyRlsDenied(message);
}

export function dbError(message = 'Errore database', details?: unknown) {
  safeTap(() => standardDbError(message, details));
  return legacyDbError(message, details);
}

export function notReady(message = 'Risorsa non pronta') {
  // Non esiste un codice specifico in standardResponses; usiamo UNKNOWN per logging interno.
  safeTap(() => standardUnknownError({ endpoint: 'feed-follow/not-ready', error: new Error(message), message }));
  return legacyNotReady(message);
}

export function unknownError(params: {
  endpoint: string;
  error: unknown;
  message?: string;
  context?: Record<string, unknown>;
}) {
  safeTap(() => standardUnknownError(params));
  return legacyUnknownError(params);
}
