export function requireParam(params, key) {
  const value = params[key];
  if (null == value || ('string' === typeof value && !value.trim())) {
    throw new Error(`Missing required param: ${key}`);
  }
  return 'string' === typeof value ? value.trim() : value;
}

export function formatDate(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function formatSpace(space, index = '') {
  const label = index ? `${index}. ` : '';
  return [
    `${label}**${space.displayName ?? space.name ?? 'Unnamed space'}**`,
    space.name ? `ID: \`${space.name}\`` : '',
    space.spaceType ? `Type: ${space.spaceType}` : '',
    space.spaceThreadingState ? `Threading: ${space.spaceThreadingState}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatMessage(message, index = '') {
  const label = index ? `${index}. ` : '';
  const sender =
    message.sender?.displayName ??
    message.sender?.name ??
    message.creator?.displayName ??
    'Unknown';
  const body = message.text ?? message.argumentText ?? '(non-text message)';

  return [
    `${label}**${sender}** - ${formatDate(message.createTime)}`,
    message.name ? `ID: \`${message.name}\`` : '',
    message.thread?.name ? `Thread: \`${message.thread.name}\`` : '',
    '',
    body,
  ]
    .filter((line) => '' === line || Boolean(line))
    .join('\n');
}
