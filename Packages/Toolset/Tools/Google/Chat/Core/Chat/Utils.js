import { formatGoogleDate, requireParam } from '../../../Common.js';

export { requireParam };
export const formatDate = formatGoogleDate;

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
