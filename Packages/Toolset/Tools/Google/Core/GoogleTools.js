import {
  clampInteger,
  formatDate,
  formatList,
  requireConnectorCredentials,
  requireText,
  truncateText
} from '../../../Core/ConnectorHttp.js';

// ── In-memory token cache (per process lifetime) ─────────────────────────────
const tokenCache = new Map(); // connectorId → { accessToken, expiresAt }

async function getAccessToken(rootDirectory) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'google',
    ['clientId', 'clientSecret', 'refreshToken'],
    'Google Workspace'
  );

  const cacheKey = credentials.clientId;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.accessToken;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type:    'refresh_token'
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(
      `Google token refresh failed: ${data?.error_description ?? data?.error ?? response.statusText}`
    );
  }

  const expiresIn = (data.expires_in ?? 3600) * 1000;
  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    // Subtract 60 s as a safety buffer
    expiresAt: Date.now() + expiresIn - 60_000
  });

  return data.access_token;
}

async function googleRequest(rootDirectory, url, { searchParams = {} } = {}) {
  const accessToken = await getAccessToken(rootDirectory);
  const requestUrl = new URL(url);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') requestUrl.searchParams.set(key, String(value));
  }
  const response = await fetch(requestUrl, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${data?.error?.message ?? data?.error_description ?? 'Google request failed'}`);
  return data;
}

function decodeBase64Url(value = '') {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function messageHeaders(message) {
  return Object.fromEntries((message.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value]));
}

function formatDriveFile(file, index = null) {
  return [
    `${index == null ? '' : `${index + 1}. `}${file.name}`,
    `ID: ${file.id}`,
    `Type: ${file.mimeType}`,
    `Modified: ${formatDate(file.modifiedTime)}`,
    file.webViewLink ? `URL: ${file.webViewLink}` : ''
  ].filter(Boolean).join('\n');
}

function formatCalendarEvent(event, index = null) {
  const start = event.start?.dateTime ?? event.start?.date ?? '';
  const end = event.end?.dateTime ?? event.end?.date ?? '';
  return [
    `${index == null ? '' : `${index + 1}. `}${event.summary || '(untitled event)'}`,
    `When: ${formatDate(start)}${end ? ` - ${formatDate(end)}` : ''}`,
    `Location: ${event.location ?? '(none)'}`,
    `ID: ${event.id}`,
    event.htmlLink ? `URL: ${event.htmlLink}` : ''
  ].filter(Boolean).join('\n');
}

export function createGoogleToolHandlers({ rootDirectory }) {
  return {
    async google_get_profile() {
      const profile = await googleRequest(rootDirectory, 'https://www.googleapis.com/oauth2/v2/userinfo');
      return [`Google profile: ${profile.name || profile.email}`, `Email: ${profile.email}`, `ID: ${profile.id}`].join('\n');
    },

    async gmail_search_emails(params = {}) {
      const query = requireText(params.query, 'query');
      const limit = clampInteger(params.limit, 10, 1, 25);
      const data = await googleRequest(rootDirectory, 'https://gmail.googleapis.com/gmail/v1/users/me/messages', {
        searchParams: { q: query, maxResults: limit }
      });
      const messages = data.messages ?? [];
      if (!messages.length) return `No Gmail messages found for "${query}".`;
      const details = await Promise.all(messages.slice(0, limit).map((message) =>
        googleRequest(rootDirectory, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
          searchParams: { format: 'metadata' }
        }).catch(() => ({ id: message.id, snippet: '' }))
      ));
      return formatList(`Gmail search: ${query}`, details.map((message, index) => {
        const headers = messageHeaders(message);
        return `${index + 1}. ${headers.subject ?? '(no subject)'}\n   From: ${headers.from ?? '(unknown)'}\n   ID: ${message.id}\n   ${message.snippet ?? ''}`;
      }));
    },

    async gmail_get_message(params = {}) {
      const messageId = requireText(params.message_id ?? params.messageId, 'message_id');
      const message = await googleRequest(rootDirectory, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`, {
        searchParams: { format: 'full' }
      });
      const headers = messageHeaders(message);
      const bodyData = message.payload?.body?.data
        ?? message.payload?.parts?.find((part) => part.mimeType === 'text/plain')?.body?.data
        ?? '';
      return [
        `Gmail message: ${headers.subject ?? '(no subject)'}`,
        `From: ${headers.from ?? '(unknown)'}`,
        `To: ${headers.to ?? '(unknown)'}`,
        `Date: ${headers.date ?? '(unknown)'}`,
        `ID: ${message.id}`,
        '',
        truncateText(bodyData ? decodeBase64Url(bodyData) : message.snippet, 4000)
      ].join('\n');
    },

    async drive_list_files(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 25);
      const data = await googleRequest(rootDirectory, 'https://www.googleapis.com/drive/v3/files', {
        searchParams: {
          pageSize: limit,
          orderBy: 'modifiedTime desc',
          fields: 'files(id,name,mimeType,modifiedTime,webViewLink)'
        }
      });
      return formatList('Google Drive files', (data.files ?? []).map(formatDriveFile));
    },

    async drive_search_files(params = {}) {
      const query = requireText(params.query, 'query').replaceAll("'", "\\'");
      const limit = clampInteger(params.limit, 10, 1, 25);
      const data = await googleRequest(rootDirectory, 'https://www.googleapis.com/drive/v3/files', {
        searchParams: {
          pageSize: limit,
          q: `name contains '${query}' and trashed = false`,
          fields: 'files(id,name,mimeType,modifiedTime,webViewLink)'
        }
      });
      return formatList(`Google Drive search: ${params.query}`, (data.files ?? []).map(formatDriveFile));
    },

    async calendar_get_upcoming(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 25);
      const data = await googleRequest(rootDirectory, 'https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        searchParams: {
          maxResults: limit,
          singleEvents: true,
          orderBy: 'startTime',
          timeMin: new Date().toISOString()
        }
      });
      return formatList('Upcoming Google Calendar events', (data.items ?? []).map(formatCalendarEvent));
    },

    async calendar_search_events(params = {}) {
      const query = requireText(params.query, 'query');
      const limit = clampInteger(params.limit, 10, 1, 25);
      const data = await googleRequest(rootDirectory, 'https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        searchParams: {
          q: query,
          maxResults: limit,
          singleEvents: true,
          orderBy: 'startTime'
        }
      });
      return formatList(`Google Calendar search: ${query}`, (data.items ?? []).map(formatCalendarEvent));
    }
  };
}
