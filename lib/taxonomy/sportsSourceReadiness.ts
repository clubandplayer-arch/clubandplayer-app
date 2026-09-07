export const SOURCE_APPROVAL_EVIDENCE_FIELDS = [
  'primaryAuthority',
  'datasetUrl',
  'stableRecordIdentifier',
  'datasetVersionOrEffectiveDate',
  'explicitReuseTermsUrl',
  'licenseIdentifier',
  'attribution',
  'coverageAndExclusions',
  'retrievalChecksum',
] as const;

type ApprovalEvidenceField = (typeof SOURCE_APPROVAL_EVIDENCE_FIELDS)[number];

export type SportsSourceApprovalEvidence = Partial<Record<ApprovalEvidenceField, string>>;

export type SportsSourceReadinessInput = {
  key: string;
  status: 'discovery_only' | 'candidate_pending_evidence' | 'approved_for_manifest';
  reuseStatus: string;
  stableRecordIdentifiers: string;
  approvalEvidence?: SportsSourceApprovalEvidence;
};

export type SportsSourceReadinessResult = {
  key: string;
  readyForLocalManifest: boolean;
  blockers: string[];
};

const PLACEHOLDER = /^(?:|TODO|TBD|UNKNOWN|N\/A|CONFIRM_REQUIRED|not_evidenced)$/i;

export function assessSportsSourceReadiness(
  source: SportsSourceReadinessInput,
): SportsSourceReadinessResult {
  const blockers: string[] = [];

  if (source.status !== 'approved_for_manifest') {
    blockers.push(`status:${source.status}`);
  }
  if (source.reuseStatus !== 'approved_explicit_reuse_terms') {
    blockers.push(`reuse:${source.reuseStatus}`);
  }
  if (source.stableRecordIdentifiers !== 'evidenced') {
    blockers.push('stable_record_identifiers:not_evidenced');
  }

  for (const field of SOURCE_APPROVAL_EVIDENCE_FIELDS) {
    const value = source.approvalEvidence?.[field]?.trim() ?? '';
    if (PLACEHOLDER.test(value)) blockers.push(`evidence:${field}:missing`);
  }

  const checksum = source.approvalEvidence?.retrievalChecksum?.trim() ?? '';
  if (checksum && !/^sha256:[a-f0-9]{64}$/.test(checksum)) {
    blockers.push('evidence:retrievalChecksum:invalid');
  }
  for (const field of ['datasetUrl', 'explicitReuseTermsUrl'] as const) {
    const value = source.approvalEvidence?.[field]?.trim() ?? '';
    if (value && !PLACEHOLDER.test(value) && !value.startsWith('https://')) {
      blockers.push(`evidence:${field}:invalid_url`);
    }
  }

  return { key: source.key, readyForLocalManifest: blockers.length === 0, blockers };
}

export function assessSportsSourceRegistry(
  sources: SportsSourceReadinessInput[],
): SportsSourceReadinessResult[] {
  return sources.map(assessSportsSourceReadiness);
}
