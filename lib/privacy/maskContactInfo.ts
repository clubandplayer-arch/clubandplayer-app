const EMAIL_ADDRESS_PATTERN = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?)+/gu;
const ITALIAN_MOBILE_PATTERN = /(?<!\d)(?:\+39[ .-]*)?3\d{2}(?:[ .-]*\d){7}(?!\d)/g;

export const MASKED_EMAIL_ADDRESS = '***@***.**';
export const MASKED_PHONE_NUMBER = '*** *** ** **';

/** Masks private contact details before user-generated text is stored or displayed. */
export function maskContactInfo(value: string): string {
  return value
    .replace(EMAIL_ADDRESS_PATTERN, MASKED_EMAIL_ADDRESS)
    .replace(ITALIAN_MOBILE_PATTERN, MASKED_PHONE_NUMBER);
}
