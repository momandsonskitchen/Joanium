import { createGoogleJsonFetch } from '../../../Core/API/GoogleApiFetch.js';
import { googlePageSize, normalizeGoogleResourceName } from '../../../Common.js';

const MEET_BASE = 'https://meet.googleapis.com/v2';
const meetFetch = createGoogleJsonFetch('Google Meet');

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
  return meetFetch(
    creds,
    `${MEET_BASE}/${normalizeGoogleResourceName(spaceName, 'spaces', 'space_name')}`,
  );
}

export async function listConferenceRecords(creds, { pageSize = 25, filter = '' } = {}) {
  const params = new URLSearchParams({
    pageSize: googlePageSize(pageSize),
  });

  if (filter) params.set('filter', filter);

  return (
    (await meetFetch(creds, `${MEET_BASE}/conferenceRecords?${params}`)).conferenceRecords ?? []
  );
}

export async function getConferenceRecord(creds, conferenceRecordName) {
  return meetFetch(
    creds,
    `${MEET_BASE}/${normalizeGoogleResourceName(
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
  const parent = normalizeGoogleResourceName(
    conferenceRecordName,
    'conferenceRecords',
    'conference_record_name',
  );
  const params = new URLSearchParams({
    pageSize: googlePageSize(pageSize),
  });

  if (filter) params.set('filter', filter);

  return (
    (await meetFetch(creds, `${MEET_BASE}/${parent}/participants?${params}`)).participants ?? []
  );
}

export async function listRecordings(creds, conferenceRecordName, { pageSize = 25 } = {}) {
  const parent = normalizeGoogleResourceName(
    conferenceRecordName,
    'conferenceRecords',
    'conference_record_name',
  );
  const params = new URLSearchParams({
    pageSize: googlePageSize(pageSize),
  });

  return (await meetFetch(creds, `${MEET_BASE}/${parent}/recordings?${params}`)).recordings ?? [];
}
