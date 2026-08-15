const EMAIL_ADDRESS_PATTERN = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?)+/gu;
const INTERNATIONAL_PHONE_PATTERN = /(?<![\p{L}\p{N}])(?:\+\d{1,3}|00\d{1,3})(?:[ .-]?\(?\d{1,4}\)?){2,}(?!\d)/gu;
const FORMATTED_LOCAL_PHONE_PATTERN = /(?<!\d)\(?\d{2,4}\)?(?:[ .-]\d{2,4}){2,}(?!\d)/g;
const ITALIAN_MOBILE_PATTERN = /(?<!\d)(?:\+39[ .-]*)?3\d{2}(?:[ .-]*\d){7}(?!\d)/g;

export const MASKED_EMAIL_ADDRESS = '***@***.**';
export const MASKED_PHONE_NUMBER = '*** *** ** **';

function maskPhoneCandidate(candidate: string): string {
  const normalized = candidate.startsWith('+')
    ? candidate.slice(1)
    : candidate.startsWith('00')
      ? candidate.slice(2)
      : candidate;
  const digitCount = normalized.replace(/\D/g, '').length;
  return digitCount >= 8 && digitCount <= 15 ? MASKED_PHONE_NUMBER : candidate;
}

/** Masks private contact details before user-generated text is stored or displayed. */
export function maskContactInfo(value: string): string {
  return value
    .replace(EMAIL_ADDRESS_PATTERN, MASKED_EMAIL_ADDRESS)
    .replace(INTERNATIONAL_PHONE_PATTERN, maskPhoneCandidate)
    .replace(ITALIAN_MOBILE_PATTERN, MASKED_PHONE_NUMBER)
    .replace(FORMATTED_LOCAL_PHONE_PATTERN, maskPhoneCandidate);
}
