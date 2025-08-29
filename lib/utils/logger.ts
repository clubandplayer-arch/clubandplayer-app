// lib/utils/logger.ts
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
const envLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
const current = LEVELS.indexOf(envLevel);

function shouldLog(level: LogLevel) {
  return LEVELS.indexOf(level) >= current;
}

export const logger = {
  debug: (...a: any[]) => shouldLog("debug") && console.debug("[debug]", ...a),
  info:  (...a: any[]) => shouldLog("info")  && console.info("[info] ", ...a),
  warn:  (...a: any[]) => shouldLog("warn")  && console.warn("[warn] ", ...a),
  error: (...a: any[]) => shouldLog("error") && console.error("[error]", ...a),
};
