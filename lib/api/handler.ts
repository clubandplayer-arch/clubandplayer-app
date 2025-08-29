// lib/api/handler.ts
import { NextRequest, NextResponse } from "next/server";
import { AppError, internalErr } from "@/lib/api/errors";
import { logger } from "@/lib/utils/logger";

function getRequestId(req: NextRequest) {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

export type ApiHandler = (req: NextRequest) => Promise<NextResponse>;

export function withApiHandler(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest) => {
    const started = Date.now();
    const requestId = getRequestId(req);
    const path = new URL(req.url).pathname;

    try {
      const res = await handler(req);
      logger.info(`${req.method} ${path} -> ${res.status} (${Date.now() - started}ms)`, { requestId });
      return res;
    } catch (e: any) {
      const err = e instanceof AppError ? e : internalErr(e?.message || "Unexpected error", e);
      const payload = {
        error: {
          code: err.code,
          message: err.message,
          requestId,
          path,
          ts: new Date().toISOString(),
        },
      };

      // log ricco solo lato server
      logger.error(`${req.method} ${path} -> ${err.status}`, { requestId, code: err.code, message: err.message, stack: e?.stack });

      return NextResponse.json(payload, { status: err.status });
    }
  };
}
