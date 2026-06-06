import { createGoogleJsonFetch } from '../../../Core/API/GoogleApiFetch.js';
import { googlePageSize, normalizeGoogleResourceName } from '../../../Common.js';

const CHAT_BASE = 'https://chat.googleapis.com/v1';
const chatFetch = createGoogleJsonFetch('Google Chat');

function normalizeSpaceName(spaceName) {
  return normalizeGoogleResourceName(spaceName, 'spaces', 'space_name');
}

function normalizeMessageName(messageName) {
  const value = String(messageName ?? '').trim();
  if (!value) throw new Error('message_name is required');
  return value;
}

export async function listSpaces(creds, { pageSize = 25, filter = '' } = {}) {
  const params = new URLSearchParams({
    pageSize: googlePageSize(pageSize),
  });

  if (filter) params.set('filter', filter);

  return (await chatFetch(creds, `${CHAT_BASE}/spaces?${params}`)).spaces ?? [];
}

export async function listMessages(
  creds,
  spaceName,
  { pageSize = 25, orderBy = 'createTime desc', filter = '' } = {},
) {
  const parent = normalizeSpaceName(spaceName);
  const params = new URLSearchParams({
    pageSize: googlePageSize(pageSize),
    orderBy: orderBy,
  });

  if (filter) params.set('filter', filter);

  return (await chatFetch(creds, `${CHAT_BASE}/${parent}/messages?${params}`)).messages ?? [];
}

export async function getMessage(creds, messageName) {
  return chatFetch(creds, `${CHAT_BASE}/${normalizeMessageName(messageName)}`);
}

export async function sendMessage(creds, spaceName, text, { threadName = '' } = {}) {
  const parent = normalizeSpaceName(spaceName);
  const params = new URLSearchParams();
  const body = { text: text };

  if (threadName) {
    body.thread = { name: threadName };
    params.set('messageReplyOption', 'REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD');
  }

  const suffix = params.toString() ? `?${params}` : '';
  return chatFetch(creds, `${CHAT_BASE}/${parent}/messages${suffix}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
