export function parseFrontmatter(content) {
  const match = String(content ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }

  return result;
}

export function stripFrontmatter(content) {
  return String(content ?? '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}
