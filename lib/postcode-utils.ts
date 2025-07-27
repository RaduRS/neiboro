/**
 * Utility functions for postcode handling
 */

/**
 * Normalizes a UK postcode by removing spaces and converting to uppercase
 * @param postcode - The postcode to normalize (e.g., "NG16 3PD" or "ng163pd")
 * @returns Normalized postcode (e.g., "NG163PD")
 */
export function normalizePostcode(postcode: string): string {
  return postcode.replace(/\s+/g, '').toUpperCase();
}

/**
 * Formats a postcode for display with proper spacing
 * @param postcode - The postcode to format (e.g., "NG163PD")
 * @returns Formatted postcode (e.g., "NG16 3PD")
 */
export function formatPostcode(postcode: string): string {
  const normalized = normalizePostcode(postcode);
  
  // UK postcode format: outward code (2-4 chars) + inward code (3 chars)
  // Examples: SW1A 1AA, M1 1AA, B33 8TH, W1A 0AX
  if (normalized.length >= 5) {
    const inwardCode = normalized.slice(-3);
    const outwardCode = normalized.slice(0, -3);
    return `${outwardCode} ${inwardCode}`;
  }
  
  return normalized;
}

/**
 * Validates if a string looks like a UK postcode
 * @param postcode - The postcode to validate
 * @returns True if it looks like a valid UK postcode format
 */
export function isValidPostcodeFormat(postcode: string): boolean {
  const normalized = normalizePostcode(postcode);
  
  // Basic UK postcode regex pattern
  const ukPostcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;
  
  return ukPostcodePattern.test(normalized);
}