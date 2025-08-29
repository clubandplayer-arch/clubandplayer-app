"use client";

import React, { createContext, useCallback, useContext } from "react";

type ToastVariant = "default" | "success" | "error" | "info" | "warning";

type BaseOptions = {
  title?: string;
  duration?: number; // ms
};

type Options = BaseOptions & {
  variant?: ToastVariant;
};

export type ToastContextType = {
  /** API principale */
  show: (message: string, opts?: Options) => void;
  /** Alias per retro-compatibilità (alcuni file usano `toast()`) */
  toast: (message: string, opts?: Options) => void;

  success: (message: string, opts?: BaseOptions) => void;
  error: (message: string, opts?: BaseOptions) => void;
  info: (message: string, opts?: BaseOptions) => void;
  warning: (message: string, opts?: BaseOptions) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const show = useCallback((message: string, opts: Options = {}) => {
    // Implementazione minima per sbloccare il deploy: logga in console.
    // In futuro puoi integrare una libreria (es. sonner, radix, shadcn, ecc.)
    const prefix =
      opts.variant === "error"
        ? "[toast:error]"
        : opts.variant === "success"
        ? "[toast:success]"
        : opts.variant === "info"
        ? "[toast:info]"
        : opts.variant === "warning"
        ? "[toast:warning]"
        : "[toast]";

    if (opts.title) {
      // eslint-disable-next-line no-console
      console.log(prefix, opts.title, "-", message);
    } else {
      // eslint-disable-next-line no-console
      console.log(prefix, message);
    }
  }, []);

  const api: ToastContextType = {
    show,
    toast: show, // alias

    success: (msg, opts = {}) => show(msg, { ...opts, variant: "success" }),
    error: (msg, opts = {}) => show(msg, { ...opts, variant: "error" }),
    info: (msg, opts = {}) => show(msg, { ...opts, variant: "info" }),
    warning: (msg, opts = {}) => show(msg, { ...opts, variant: "warning" }),
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
