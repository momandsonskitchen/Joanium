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

export function formatMeetSpace(space, index = '') {
  const label = index ? `${index}. ` : '';
  return [
    `${label}**${space.meetingCode ?? space.name ?? 'Google Meet space'}**`,
    space.name ? `ID: \`${space.name}\`` : '',
    space.meetingUri ? `Join: ${space.meetingUri}` : '',
    space.config?.accessType ? `Access: ${space.config.accessType}` : '',
    space.config?.entryPointAccess ? `Entry point access: ${space.config.entryPointAccess}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatConferenceRecord(record, index = '') {
  const label = index ? `${index}. ` : '';
  return [
    `${label}**${record.name ?? 'Conference record'}**`,
    record.space ? `Space: \`${record.space}\`` : '',
    record.startTime ? `Started: ${formatDate(record.startTime)}` : '',
    record.endTime ? `Ended: ${formatDate(record.endTime)}` : '',
    record.expireTime ? `Expires: ${formatDate(record.expireTime)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatParticipant(participant, index = '') {
  const label = index ? `${index}. ` : '';
  const signedIn = participant.signedinUser;
  const anonymous = participant.anonymousUser;
  const phone = participant.phoneUser;
  const name =
    signedIn?.displayName ??
    signedIn?.user ??
    anonymous?.displayName ??
    phone?.displayName ??
    participant.name;

  return [
    `${label}**${name ?? 'Participant'}**`,
    participant.name ? `ID: \`${participant.name}\`` : '',
    participant.earliestStartTime
      ? `First joined: ${formatDate(participant.earliestStartTime)}`
      : '',
    participant.latestEndTime ? `Last left: ${formatDate(participant.latestEndTime)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatRecording(recording, index = '') {
  const label = index ? `${index}. ` : '';
  const driveDestination = recording.driveDestination ?? {};

  return [
    `${label}**${recording.name ?? 'Recording'}**`,
    recording.state ? `State: ${recording.state}` : '',
    recording.startTime ? `Started: ${formatDate(recording.startTime)}` : '',
    recording.endTime ? `Ended: ${formatDate(recording.endTime)}` : '',
    driveDestination.file ? `Drive file: \`${driveDestination.file}\`` : '',
    driveDestination.exportUri ? `Export URI: ${driveDestination.exportUri}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
