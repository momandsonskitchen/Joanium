import { createGoogleJsonFetch } from '../../../Core/API/GoogleApiFetch.js';

const MEET_BASE = 'https://meet.googleapis.com/v2';
const meetFetch = createGoogleJsonFetch('Google Meet');

function normalizeName(value, prefix, paramName) {
  const name = String(value ?? '').trim();
  if (!name) throw new Error(`${paramName} is required`);
  return name.startsWith(`${prefix}/`) ? name : `${prefix}/${name}`;
}

function optionalConfig(config = {}) {
  const body = {};
  const spaceConfig = {};

  if (config.accessType) spaceConfig.accessType = config.accessType;
  if (config.entryPointAccess) spaceConfig.entryPointAccess = config.entryPointAccess;
  if (Object.keys(spaceConfig).length) body.config = spaceConfig;

  return body;
}

export async function createSpace(creds, config = {}) {
  return meetFetch(creds, `${MEET_BASE}/spaces`, {
    method: 'POST',
    body: JSON.stringify(optionalConfig(config)),
  });
}

export async function getSpace(creds, spaceName) {
  return meetFetch(creds, `${MEET_BASE}/${normalizeName(spaceName, 'spaces', 'space_name')}`);
}

export async function listConferenceRecords(creds, { pageSize = 25, filter = '' } = {}) {
  const params = new URLSearchParams({
    pageSize: String(Math.min(Number(pageSize) || 25, 100)),
  });

  if (filter) params.set('filter', filter);

  return (
    (await meetFetch(creds, `${MEET_BASE}/conferenceRecords?${params}`)).conferenceRecords ?? []
  );
}

export async function getConferenceRecord(creds, conferenceRecordName) {
  return meetFetch(
    creds,
    `${MEET_BASE}/${normalizeName(
      conferenceRecordName,
      'conferenceRecords',
      'conference_record_name',
    )}`,
  );
}

export async function listParticipants(
  creds,
  conferenceRecordName,
  { pageSize = 25, filter = '' } = {},
) {
  const parent = normalizeName(conferenceRecordName, 'conferenceRecords', 'conference_record_name');
  const params = new URLSearchParams({
    pageSize: String(Math.min(Number(pageSize) || 25, 100)),
  });

  if (filter) params.set('filter', filter);

  return (
    (await meetFetch(creds, `${MEET_BASE}/${parent}/participants?${params}`)).participants ?? []
  );
}

export async function listRecordings(creds, conferenceRecordName, { pageSize = 25 } = {}) {
  const parent = normalizeName(conferenceRecordName, 'conferenceRecords', 'conference_record_name');
  const params = new URLSearchParams({
    pageSize: String(Math.min(Number(pageSize) || 25, 100)),
  });

  return (await meetFetch(creds, `${MEET_BASE}/${parent}/recordings?${params}`)).recordings ?? [];
}
