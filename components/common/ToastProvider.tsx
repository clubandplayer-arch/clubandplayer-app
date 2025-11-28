"use client";

import React, { createContext, useCallback, useContext } from "react";

type ToastVariant =
  | "default"
  | "success"
  | "error"
  | "info"
  | "warning"
  | "destructive";

type BaseOptions = {
  title?: string;
  description?: string;
  duration?: number; // ms
};

type Options = BaseOptions & {
  variant?: ToastVariant;
};

/** Consente la chiamata show({ title, description, tone, durationMs }) */
type ShowConfig = {
  title?: string;
  description?: string;
  /** Alias legacy: mappato su variant */
  tone?: "default" | "success" | "error" | "info" | "warning";
  /** Alias legacy: mappato su duration */
  durationMs?: number;
  variant?: ToastVariant;
};

export type ToastContextType = {
  /** API principale (compatibile stringa o oggetto config) */
  show: (messageOrConfig: string | ShowConfig, opts?: Options) => void;
  /** Alias per retro-compatibilità */
  toast: (messageOrConfig: string | ShowConfig, opts?: Options) => void;

  success: (message: string, opts?: BaseOptions) => void;
  error: (message: string, opts?: BaseOptions) => void;
  info: (message: string, opts?: BaseOptions) => void;
  warning: (message: string, opts?: BaseOptions) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

function toneToVariant(
  tone?: ShowConfig["tone"],
  fallback?: ToastVariant
): ToastVariant | undefined {
  if (!tone) return fallback;
  if (tone === "default") return "default";
  if (tone === "success") return "success";
  if (tone === "error") return "error";
  if (tone === "info") return "info";
  if (tone === "warning") return "warning";
  return fallback;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const show = useCallback(
    (messageOrConfig: string | ShowConfig, opts: Options = {}) => {
      let title: string | undefined = opts.title;
      let description: string | undefined = opts.description;
      let variant: ToastVariant | undefined = opts.variant;
      let duration: number | undefined = opts.duration;
      let message = "";

      if (typeof messageOrConfig === "string") {
        message = messageOrConfig;
      } else {
        // forma a oggetto
        title = title ?? messageOrConfig.title;
        description = description ?? messageOrConfig.description;
        duration = duration ?? messageOrConfig.durationMs;
        variant =
          variant ??
          messageOrConfig.variant ??
          toneToVariant(messageOrConfig.tone, "default");

        // scegli cosa mostrare come messaggio base
        message =
          description ??
          title ??
          "[toast]"; /* se non arriva nulla evitiamo stringa vuota */
      }

      const prefix =
        variant === "error" || variant === "destructive"
          ? "[toast:error]"
          : variant === "success"
          ? "[toast:success]"
          : variant === "info"
          ? "[toast:info]"
          : variant === "warning"
          ? "[toast:warning]"
          : "[toast]";

      // Implementazione minima per sbloccare il deploy.
      // Sostituisci con la tua UI di toast preferita in futuro.
      if (title) {
        console.log(prefix, title, "-", message, duration ? `(dur:${duration}ms)` : "");
      } else {
        console.log(prefix, message, duration ? `(dur:${duration}ms)` : "");
      }
    },
    []
  );

  const api: ToastContextType = {
    show,
    toast: show, // alias
    success: (msg, o = {}) => show(msg, { ...o, variant: "success" }),
    error: (msg, o = {}) => show(msg, { ...o, variant: "error" }),
    info: (msg, o = {}) => show(msg, { ...o, variant: "info" }),
    warning: (msg, o = {}) => show(msg, { ...o, variant: "warning" }),
  };

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}
