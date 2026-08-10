import type { ProfileVisibilityStatus } from '@/types/profile';

export type ProfileVisibilityStatusCopy = {
  label: string;
  description: string;
  className: string;
};

export function normalizeProfileVisibilityStatus(value: unknown): ProfileVisibilityStatus {
  return value === 'published' || value === 'suspended' ? value : 'draft';
}

export function getProfileVisibilityStatusCopy(status: ProfileVisibilityStatus): ProfileVisibilityStatusCopy {
  if (status === 'published') {
    return {
      label: 'Profilo pubblicato',
      description: 'Il profilo è visibile nelle pagine pubbliche e nei risultati di ricerca.',
      className: 'border-emerald-300 bg-emerald-50 text-emerald-950',
    };
  }

  if (status === 'suspended') {
    return {
      label: 'Profilo sospeso',
      description: 'Il profilo non è visibile pubblicamente. Contatta l’assistenza per maggiori informazioni.',
      className: 'border-red-300 bg-red-50 text-red-950',
    };
  }

  return {
    label: 'Profilo in bozza',
    description: 'Il profilo non è ancora visibile pubblicamente. Completa e salva tutti i campi obbligatori.',
    className: 'border-amber-300 bg-amber-50 text-amber-950',
  };
}
