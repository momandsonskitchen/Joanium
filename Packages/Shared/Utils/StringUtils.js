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

export function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}
