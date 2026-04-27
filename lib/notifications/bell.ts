export const BELL_EXCLUDED_KINDS = ['message', 'new_message'] as const;

export function buildBellExcludedKindsInClause() {
  return `(${BELL_EXCLUDED_KINDS.map((kind) => `"${kind}"`).join(',')})`;
}
