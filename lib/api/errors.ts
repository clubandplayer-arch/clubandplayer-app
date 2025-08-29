// lib/api/errors.ts
export type ErrorCode =
  | "BadRequest"
  | "Unauthorized"
  | "Forbidden"
  | "NotFound"
  | "Conflict"
  | "Unprocessable"
  | "TooManyRequests"
  | "InternalError";

export class AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: unknown;

  constructor(message: string, status = 400, code: ErrorCode = "BadRequest", details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// scorciatoie utili
export const badRequest   = (msg = "Bad request", details?: unknown) => new AppError(msg, 400, "BadRequest", details);
export const unauthorized = (msg = "Unauthorized") => new AppError(msg, 401, "Unauthorized");
export const forbidden    = (msg = "Forbidden") => new AppError(msg, 403, "Forbidden");
export const notFound     = (msg = "Not found") => new AppError(msg, 404, "NotFound");
export const conflict     = (msg = "Conflict") => new AppError(msg, 409, "Conflict");
export const unprocessable= (msg = "Unprocessable") => new AppError(msg, 422, "Unprocessable");
export const tooMany      = (msg = "Too many requests") => new AppError(msg, 429, "TooManyRequests");
export const internalErr  = (msg = "Internal server error", details?: unknown) => new AppError(msg, 500, "InternalError", details);
