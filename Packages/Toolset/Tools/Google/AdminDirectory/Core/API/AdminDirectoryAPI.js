import { createGoogleJsonFetch } from '../../../Core/API/GoogleApiFetch.js';

const ADMIN_DIRECTORY_BASE = 'https://admin.googleapis.com/admin/directory/v1';
const adminDirectoryFetch = createGoogleJsonFetch('Admin Directory', {
  forbiddenErrorMessage:
    'Admin Directory access requires a Google Workspace administrator account with Admin SDK API access',
});

function pageSize(value, fallback = 25) {
  return String(Math.min(Number(value) || fallback, 500));
}

function applyCustomerOrDomain(params, { customer = 'my_customer', domain = '' } = {}) {
  if (domain) params.set('domain', domain);
  else params.set('customer', customer || 'my_customer');
}

export async function listUsers(
  creds,
  { maxResults = 25, customer = 'my_customer', domain = '', query = '', projection = 'BASIC' } = {},
) {
  const params = new URLSearchParams({
    maxResults: pageSize(maxResults),
    orderBy: 'email',
    projection: projection,
  });

  applyCustomerOrDomain(params, { customer: customer, domain: domain });
  if (query) params.set('query', query);

  return (await adminDirectoryFetch(creds, `${ADMIN_DIRECTORY_BASE}/users?${params}`)).users ?? [];
}

export async function getUser(creds, userKey, { projection = 'FULL' } = {}) {
  const params = new URLSearchParams({
    projection: projection,
  });

  return adminDirectoryFetch(
    creds,
    `${ADMIN_DIRECTORY_BASE}/users/${encodeURIComponent(userKey)}?${params}`,
  );
}

export async function listGroups(
  creds,
  { maxResults = 25, customer = 'my_customer', domain = '', userKey = '' } = {},
) {
  const params = new URLSearchParams({
    maxResults: pageSize(maxResults),
  });

  if (userKey) params.set('userKey', userKey);
  else applyCustomerOrDomain(params, { customer: customer, domain: domain });

  return (
    (await adminDirectoryFetch(creds, `${ADMIN_DIRECTORY_BASE}/groups?${params}`)).groups ?? []
  );
}

export async function getGroup(creds, groupKey) {
  return adminDirectoryFetch(
    creds,
    `${ADMIN_DIRECTORY_BASE}/groups/${encodeURIComponent(groupKey)}`,
  );
}

export async function listGroupMembers(creds, groupKey, { maxResults = 25, roles = '' } = {}) {
  const params = new URLSearchParams({
    maxResults: pageSize(maxResults),
  });

  if (roles) params.set('roles', roles);

  return (
    (
      await adminDirectoryFetch(
        creds,
        `${ADMIN_DIRECTORY_BASE}/groups/${encodeURIComponent(groupKey)}/members?${params}`,
      )
    ).members ?? []
  );
}
