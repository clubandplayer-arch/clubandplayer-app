import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'INVALID_PAYLOAD'
  | 'NOT_AUTHENTICATED'
  | 'NOT_AUTHORIZED'
  | 'NOT_FOUND'
  | 'RLS_DENIED'
  | 'DB_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export type ApiErrorResponse = {
  ok: false;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiSuccessResponse<T extends Record<string, unknown>> = { ok: true } & T;

function statusFromCode(code: ApiErrorCode): number {
  switch (code) {
    case 'INVALID_PAYLOAD':
      return 400;
    case 'NOT_AUTHENTICATED':
      return 401;
    case 'NOT_AUTHORIZED':
    case 'RLS_DENIED':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'RATE_LIMITED':
      return 429;
    case 'DB_ERROR':
    case 'UNKNOWN':
    default:
      return 500;
  }
}

export function successResponse<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccessResponse<T>>({ ok: true, ...data }, init);
}

export function errorResponse(code: ApiErrorCode, message: string, init?: ResponseInit, details?: unknown) {
  return NextResponse.json<ApiErrorResponse>({ ok: false, code, message, ...(details ? { details } : {}) }, {
    status: statusFromCode(code),
    ...init,
  });
}

export const invalidPayload = (message: string, details?: unknown) =>
  errorResponse('INVALID_PAYLOAD', message, undefined, details);

export const notAuthenticated = (message = 'Profilo non autenticato') =>
  errorResponse('NOT_AUTHENTICATED', message);

export const notAuthorized = (message = 'Operazione non consentita') =>
  errorResponse('NOT_AUTHORIZED', message);

export const notFoundResponse = (message = 'Risorsa non trovata') => errorResponse('NOT_FOUND', message);

export const rlsDenied = (message = 'Accesso negato dalle policy RLS') => errorResponse('RLS_DENIED', message);

export const dbError = (message = 'Errore database', details?: unknown) =>
  errorResponse('DB_ERROR', message, undefined, details);

export const rateLimited = (message = 'Rate limit attivo') => errorResponse('RATE_LIMITED', message);

export function unknownError(params: {
  endpoint: string;
  error: unknown;
  message?: string;
  context?: Record<string, unknown>;
}) {
  const { endpoint, error, message = 'Errore inatteso', context } = params;
  console.error(`[${endpoint}] errore`, error, context);
  return errorResponse('UNKNOWN', message);
}
