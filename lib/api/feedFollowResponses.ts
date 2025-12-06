import { NextResponse } from 'next/server';
import { reportApiError } from '@/lib/monitoring/reportApiError';

export type ApiErrorCode =
  | 'INVALID_PAYLOAD'
  | 'NOT_AUTHENTICATED'
  | 'NOT_AUTHORIZED'
  | 'NOT_FOUND'
  | 'RLS_DENIED'
  | 'DB_ERROR'
  | 'RATE_LIMITED'
  | 'NOT_READY'
  | 'UNKNOWN'
  | (string & {});

export type ApiErrorResponse = {
  ok: false;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiSuccessResponse<T extends Record<string, unknown>> = { ok: true } & T;

function buildErrorResponse(code: ApiErrorCode, message: string, status: number, details?: unknown) {
  return NextResponse.json<ApiErrorResponse>(
    { ok: false, code, message, ...(details ? { details } : {}) },
    { status },
  );
}

export function validationError(message: string, details?: unknown) {
  return buildErrorResponse('INVALID_PAYLOAD', message, 400, details);
}

export function notAuthenticated(message = 'Utente non autenticato') {
  return buildErrorResponse('NOT_AUTHENTICATED', message, 401);
}

export function notAuthorized(message = 'Operazione non consentita') {
  return buildErrorResponse('NOT_AUTHORIZED', message, 403);
}

export function notFoundError(message = 'Risorsa non trovata') {
  return buildErrorResponse('NOT_FOUND', message, 404);
}

export function rateLimited(message = 'Rate limit attivo', details?: unknown) {
  return buildErrorResponse('RATE_LIMITED', message, 429, details);
}

export function rlsDenied(message = 'Accesso negato dalle policy RLS') {
  return buildErrorResponse('RLS_DENIED', message, 403);
}

export function dbError(message = 'Errore database', details?: unknown) {
  return buildErrorResponse('DB_ERROR', message, 500, details);
}

export function notReady(message = 'Risorsa non pronta') {
  return buildErrorResponse('NOT_READY', message, 503);
}

export function unknownError({
  endpoint,
  error,
  message = 'Errore inatteso',
  context,
}: {
  endpoint: string;
  error: unknown;
  message?: string;
  context?: Record<string, unknown>;
}) {
  console.error(`[${endpoint}] errore`, error);
  reportApiError({ endpoint, error, context });
  return buildErrorResponse('UNKNOWN', message, 500);
}

export function successResponse<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccessResponse<T>>({ ok: true, ...data }, init);
}
