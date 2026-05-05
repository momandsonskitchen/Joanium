export function sanitizeFileStem(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9_\-]/g, '').trim();
}

export function sanitizePathSegment(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
}

export function sanitizeMarkdownFilename(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9_\-. ]/g, '').trim();
}
