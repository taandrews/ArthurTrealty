/** Normalize a US phone number to E.164 (+15551234567). Returns undefined if it isn't a valid US number. */
export function toE164(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined;
}
