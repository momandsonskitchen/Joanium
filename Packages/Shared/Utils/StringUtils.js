export function collapseWhitespace(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function createSlugId(value, fallback) {
  const safeFallback = collapseWhitespace(fallback) || 'Item';
  const sanitized =
    (collapseWhitespace(value) || safeFallback)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || safeFallback;
  const unique = Math.random().toString(36).slice(2, 7).padEnd(5, '0');
  return `${sanitized}-${unique}`;
}

export function getNameInitials(name, fallback = '?') {
  const parts = collapseWhitespace(name ?? '')
    .split(' ')
    .filter(Boolean);

  if (parts.length >= 2) {
    const firstLetter = parts[0][0].toUpperCase();
    const lastWord = parts[parts.length - 1];
    const secondLetter = (lastWord[1] ?? lastWord[0]).toUpperCase();
    return `${firstLetter}${secondLetter}`;
  }

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return fallback;
}

export function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function extractJsonObject(text = '') {
  const source = String(text ?? '').trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  return source.slice(start, end + 1);
}

export function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
