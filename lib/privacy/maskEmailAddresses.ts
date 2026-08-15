const EMAIL_ADDRESS_PATTERN = /[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?)+/gu;

export const MASKED_EMAIL_ADDRESS = '***@***.**';

/** Masks email addresses before user-generated text is stored or displayed. */
export function maskEmailAddresses(value: string): string {
  return value.replace(EMAIL_ADDRESS_PATTERN, MASKED_EMAIL_ADDRESS);
}
