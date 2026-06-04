export function toFileUrl(filePath) {
  const rawPath = String(filePath ?? '').trim();
  if (!rawPath) return null;
  if (rawPath.startsWith('file://')) return rawPath;

  const slashPath = rawPath.replace(/\\/g, '/');
  const encodeSegment = (segment, index) => {
    if (index === 0 && /^[a-zA-Z]:$/.test(segment)) return segment;
    return encodeURIComponent(segment);
  };

  if (slashPath.startsWith('//')) {
    const [host, ...segments] = slashPath.slice(2).split('/');
    return `file://${encodeURIComponent(host)}/${segments.map(encodeSegment).join('/')}`;
  }

  const prefix = /^[a-zA-Z]:\//.test(slashPath) ? 'file:///' : 'file://';
  return `${prefix}${slashPath.split('/').map(encodeSegment).join('/')}`;
}
