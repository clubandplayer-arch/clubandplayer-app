import type { Viewport } from 'next';

/**
 * Next 15: centralizziamo il viewport a livello di app/.
 * Rimuovere eventuali `export const viewport` locali e la chiave `viewport` dentro `metadata`.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Opzionali futuri: themeColor, colorScheme, maximumScale, userScalable, interactiveWidget, etc.
};
