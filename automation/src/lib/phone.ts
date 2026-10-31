/** Normalize a US phone number to E.164 (+15551234567). Returns undefined if it isn't a valid US number. */
export function toE164(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined;
}

/** Premium-rate, personal-communications and other non-geographic +1 area codes. */
const NON_GEOGRAPHIC = [
  '500', '521', '522', '523', '524', '525', '526', '527', '528', '529', '530', '531', '532', '533', '535', '538',
  '542', '543', '544', '545', '546', '547', '549', '550', '566', '577', '588', '600', '700', '710', '900', '976',
];
/** Other NANP countries (Caribbean, Atlantic). US territories (787, 939, 340, 670, 671, 684) are allowed. */
const OTHER_COUNTRIES = [
  '242', '246', '264', '268', '284', '345', '441', '473', '649', '658', '664', '721', '758', '767', '784',
  '809', '829', '849', '868', '869', '876',
];
/** Canada: outside the service area. */
const CANADA = [
  '204', '226', '236', '249', '250', '263', '289', '306', '343', '354', '365', '367', '368', '382', '403', '416',
  '418', '428', '431', '437', '438', '450', '468', '474', '506', '514', '519', '548', '579', '581', '584', '587',
  '604', '613', '639', '647', '672', '683', '705', '709', '742', '753', '778', '780', '782', '807', '819', '825',
  '867', '873', '879', '902', '905',
];
const BLOCKED = new Set([...NON_GEOGRAPHIC, ...OTHER_COUNTRIES, ...CANADA]);

/**
 * Anyone can type a number into the public form, and calls and texts cost money per destination.
 * True for numbers we must never call or text: premium/non-geographic codes, N11 codes, other countries
 * that share +1, and malformed NANP numbers (area code or exchange starting with 0 or 1).
 */
export function isBlockedPhone(e164: string): boolean {
  const m = /^\+1(\d{3})(\d{3})\d{4}$/.exec(e164);
  if (!m) return true;
  const [, area, exchange] = m;
  if (/^[01]/.test(area) || /^[01]/.test(exchange)) return true;
  if (area.slice(1) === '11') return true;
  return BLOCKED.has(area);
}

/** A US number we may call or text, in E.164; undefined if invalid or blocked. */
export function toUsPhone(input: string | undefined): string | undefined {
  const e164 = toE164(input);
  return e164 && !isBlockedPhone(e164) ? e164 : undefined;
}
