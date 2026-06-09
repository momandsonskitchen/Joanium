function iconUrl(iconFile) {
  return new URL(`../../../Assets/Icons/${iconFile}.png`, import.meta.url).toString();
}

export { iconUrl };

export function getIconPath(id, iconFiles) {
  const iconFile = iconFiles[String(id ?? '').toLowerCase()];
  return iconFile ? iconUrl(iconFile) : null;
}
