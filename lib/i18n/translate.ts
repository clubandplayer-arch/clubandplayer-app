import type { MessageKey, Messages } from './messages';

export type MessageValues = Record<string, string | number>;

/**
 * Replaces named placeholders while deliberately preserving unknown placeholders.
 * Preserving them is safer than silently deleting content when a caller omits a value.
 */
export function interpolateMessage(message: string, values?: MessageValues): string {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

/**
 * Resolves a message through one explicit fallback catalog and finally exposes the
 * key. Keeping this pure makes the same contract usable from server and client code.
 */
export function translateWithFallback(
  key: string,
  messages: Partial<Messages>,
  fallbackMessages: Messages,
  values?: MessageValues,
): string {
  const message = messages[key as MessageKey] ?? fallbackMessages[key as MessageKey] ?? key;
  return interpolateMessage(message, values);
}
