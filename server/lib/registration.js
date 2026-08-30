/**
 * Registration-number helpers shared by the API.
 *
 * The full number is PII: it can be used to look a vehicle up in public RTO
 * databases. It is stored in full but only returned to the owning seller and to
 * admins; everyone else receives the masked form.
 */

/**
 * Masks a registration number for public display, keeping the RTO prefix and
 * the last four digits. MH12AB1234 → "MH12 •• 1234".
 * Returns undefined when there is nothing to mask, so the field is simply
 * absent from the JSON rather than an empty string.
 */
export function maskRegistrationNumber(reg) {
  if (!reg) return undefined;
  const cleaned = String(reg).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length < 6) return "••••";
  return `${cleaned.slice(0, 4)} •• ${cleaned.slice(-4)}`;
}

/**
 * Accepts both the standard state format (MH12AB1234, with or without
 * separators) and the Bharat series (22BH1234A).
 */
export function isValidRegistrationNumber(reg) {
  if (!reg) return true; // optional field
  const cleaned = String(reg).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(cleaned) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(cleaned);
}
