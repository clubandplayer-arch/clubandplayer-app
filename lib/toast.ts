'use client';

export type ToastParams = {
  message: string;
  type?: 'success' | 'error' | 'info';
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

const EVENT_NAME = 'app:toast';

export function toast(p: ToastParams) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: p }));
}

export const toastSuccess = (message: string, durationMs?: number) =>
  toast({ message, type: 'success', durationMs });

export const toastError = (message: string, durationMs?: number) =>
  toast({ message, type: 'error', durationMs });

export const toastInfo = (message: string, durationMs?: number) =>
  toast({ message, type: 'info', durationMs });
