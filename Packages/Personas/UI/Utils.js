/**
 * Converts a raw filename-derived name (e.g. "leslie-chow", "john_doe")
 * into a properly capitalised display name ("Leslie Chow", "John Doe").
 * Has no effect on names that are already well-formed.
 */
export function formatPersonaName(name) {
  return String(name ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}
