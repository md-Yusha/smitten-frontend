export const INDIA_PHONE_PREFIX = '+91 ';
export const INDIA_PHONE_DIGIT_LENGTH = 10;
export const INDIA_PHONE_MAX_LENGTH = INDIA_PHONE_PREFIX.length + INDIA_PHONE_DIGIT_LENGTH;

export function getIndianPhoneDigits(value: string): string {
  const normalized = value.trim().startsWith('+91') ? value.trim().slice(3) : value;
  return normalized.replace(/\D/g, '').slice(0, INDIA_PHONE_DIGIT_LENGTH);
}

export function formatIndianPhoneInput(value: string): string {
  return `${INDIA_PHONE_PREFIX}${getIndianPhoneDigits(value)}`;
}

export function isCompleteIndianPhone(value: string): boolean {
  return getIndianPhoneDigits(value).length === INDIA_PHONE_DIGIT_LENGTH;
}
