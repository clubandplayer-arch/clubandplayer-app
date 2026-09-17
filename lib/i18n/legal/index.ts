import type { Locale } from '@/lib/i18n/config';
import it, { type LegalMessages } from './it';
import en from './en';
import fr from './fr';
import es from './es';

// Bundled together so an existing locale change needs no additional request.
export const legalCopy: Record<Locale, LegalMessages> = { it, en, fr, es };
