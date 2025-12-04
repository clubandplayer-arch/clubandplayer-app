import { NextResponse } from 'next/server';

type JsonInit = ResponseInit | undefined;

type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | (string & {});

export function ok<T extends Record<string, unknown>>(data: T, init?: JsonInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ ok: false, code: 'BAD_REQUEST', message, ...(details ? { details } : {}) }, { status: 400 });
}

export function unauthorized(message = 'Non autenticato') {
  return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', message }, { status: 401 });
}

export function forbidden(message = 'Operazione non consentita') {
  return NextResponse.json({ ok: false, code: 'FORBIDDEN', message }, { status: 403 });
}

export function notFound(message = 'Risorsa non trovata') {
  return NextResponse.json({ ok: false, code: 'NOT_FOUND', message }, { status: 404 });
}

export function tooManyRequests(message = 'Troppe richieste', details?: unknown) {
  return NextResponse.json(
    { ok: false, code: 'TOO_MANY_REQUESTS', message, ...(details ? { details } : {}) },
    { status: 429 },
  );
}

export function internalError(error: unknown, message = 'Errore imprevisto') {
  const errMessage = error instanceof Error ? error.message : String(error);
  console.error('[api] internalError', { message: errMessage });
  return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR', message }, { status: 500 });
}

export function errorResponse(code: ErrorCode, message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, code, message, ...(details ? { details } : {}) }, { status });
}
