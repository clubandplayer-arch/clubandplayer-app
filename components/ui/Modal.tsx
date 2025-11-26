'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative mx-auto mt-16 w-[95%] max-w-lg overflow-hidden rounded-2xl border bg-white shadow-2xl sm:mt-0">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 hover:bg-gray-100" aria-label="Chiudi modale">
            ✕
          </button>
        </div>
        <div className="p-5 max-h-[calc(100vh-8rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}
