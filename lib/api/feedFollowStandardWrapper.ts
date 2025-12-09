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

function tap<T>(fn: () => T): T {
  return fn();
}

export function successResponse<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  tap(() => standardSuccessResponse(data, init));
  return legacySuccessResponse(data, init);
}

export function validationError(message: string, details?: unknown) {
  tap(() => standardInvalidPayload(message, details));
  return legacyValidationError(message, details);
}

export function notAuthenticated(message = 'Utente non autenticato') {
  tap(() => standardNotAuthenticated(message));
  return legacyNotAuthenticated(message);
}

export function notAuthorized(message = 'Operazione non consentita') {
  tap(() => standardNotAuthorized(message));
  return legacyNotAuthorized(message);
}

export function notFoundError(message = 'Risorsa non trovata') {
  tap(() => standardNotFoundResponse(message));
  return legacyNotFoundError(message);
}

export function rateLimited(message = 'Rate limit attivo', details?: unknown) {
  tap(() => standardRateLimited(message));
  return legacyRateLimited(message, details);
}

export function rlsDenied(message = 'Accesso negato dalle policy RLS') {
  tap(() => standardRlsDenied(message));
  return legacyRlsDenied(message);
}

export function dbError(message = 'Errore database', details?: unknown) {
  tap(() => standardDbError(message, details));
  return legacyDbError(message, details);
}

export function notReady(message = 'Risorsa non pronta') {
  // Non esiste un codice specifico in standardResponses; usiamo UNKNOWN per logging interno.
  tap(() => standardUnknownError({ endpoint: 'feed-follow/not-ready', error: new Error(message), message }));
  return legacyNotReady(message);
}

export function unknownError(params: {
  endpoint: string;
  error: unknown;
  message?: string;
  context?: Record<string, unknown>;
}) {
  tap(() => standardUnknownError(params));
  return legacyUnknownError(params);
}
