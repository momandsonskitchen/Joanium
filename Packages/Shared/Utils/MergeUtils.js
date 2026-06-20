export function deepMerge(current, imported) {
  if (current === null || current === undefined) return imported;
  if (imported === null || imported === undefined) return current;

  if (Array.isArray(current) && Array.isArray(imported)) {
    const seen = new Set(current.map((v) => JSON.stringify(v)));
    const extras = imported.filter((v) => !seen.has(JSON.stringify(v)));
    return [...current, ...extras];
  }

  if (
    typeof current === 'object' &&
    typeof imported === 'object' &&
    !Array.isArray(current) &&
    !Array.isArray(imported)
  ) {
    const result = { ...imported };
    for (const key of Object.keys(current)) {
      if (key === '__proto__' || key === 'constructor') continue;
      result[key] = deepMerge(current[key], imported[key]);
    }
    return result;
  }

  if (current !== '') return current;
  return imported;
}
