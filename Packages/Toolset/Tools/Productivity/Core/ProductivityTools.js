import { buildUrl, requireConnectorCredentials } from '../../../Core/ConnectorHttp.js';
import strings from '../I18n/en.js';
import {
  compactObject,
  formatList,
  optionalText,
  parseLimit,
  parseObject,
  readServiceJson,
  readText,
  toBoolean,
  truncate,
} from './Utils.js';

const AIRTABLE_API = 'https://api.airtable.com/v0';
const DISCORD_WEBHOOK_HOSTS = new Set([
  'canary.discord.com',
  'discord.com',
  'discordapp.com',
  'ptb.discord.com',
]);
const SLACK_API = 'https://slack.com/api';
const TELEGRAM_API = 'https://api.telegram.org';
const TODOIST_API = 'https://api.todoist.com/api/v1';
const connectorLabels = Object.fromEntries(
  strings.connectors.map((connector) => [connector.id, connector.label]),
);

async function slackRequest(rootDirectory, path, { method = 'GET', body, searchParams = {} } = {}) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'slack',
    ['token'],
    connectorLabels.slack,
  );
  const response = await fetch(buildUrl(SLACK_API, path, searchParams), {
    method,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credentials.token}`,
      'content-type': 'application/json; charset=utf-8',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await readServiceJson(response, connectorLabels.slack);
  if (data.ok === false) {
    throw new Error(
      `${strings.errors.requestFailed.replace('{service}', connectorLabels.slack)} ${data.error}`,
    );
  }
  return data;
}

async function discordRequest(rootDirectory, body) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'discord',
    ['webhookUrl'],
    connectorLabels.discord,
  );
  let url;
  try {
    url = new URL(credentials.webhookUrl);
  } catch {
    throw new Error(strings.errors.invalidDiscordWebhook);
  }
  if (!DISCORD_WEBHOOK_HOSTS.has(url.hostname) || !url.pathname.startsWith('/api/webhooks/')) {
    throw new Error(strings.errors.invalidDiscordWebhook);
  }
  url.searchParams.set('wait', 'true');

  const response = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readServiceJson(response, connectorLabels.discord);
}

async function telegramRequest(rootDirectory, methodName, body = null) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'telegram',
    ['botToken'],
    connectorLabels.telegram,
  );
  const response = await fetch(`${TELEGRAM_API}/bot${credentials.botToken}/${methodName}`, {
    method: body ? 'POST' : 'GET',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await readServiceJson(response, connectorLabels.telegram);
  if (data.ok === false) {
    throw new Error(
      `${strings.errors.requestFailed.replace('{service}', connectorLabels.telegram)} ${data.description}`,
    );
  }
  return data.result ?? {};
}

async function airtableRequest(
  rootDirectory,
  baseId,
  table,
  { method = 'GET', body, searchParams = {} } = {},
) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'airtable',
    ['token'],
    connectorLabels.airtable,
  );
  const tablePath = `/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`;
  const response = await fetch(buildUrl(AIRTABLE_API, tablePath, searchParams), {
    method,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credentials.token}`,
      'content-type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return readServiceJson(response, connectorLabels.airtable);
}

async function todoistRequest(
  rootDirectory,
  path,
  { method = 'GET', body, searchParams = {} } = {},
) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'todoist',
    ['token'],
    connectorLabels.todoist,
  );
  const response = await fetch(buildUrl(TODOIST_API, path, searchParams), {
    method,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credentials.token}`,
      'content-type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return readServiceJson(response, connectorLabels.todoist);
}

async function resolveAirtableBaseId(rootDirectory, params = {}) {
  const credentials = await requireConnectorCredentials(
    rootDirectory,
    'airtable',
    ['token'],
    connectorLabels.airtable,
  );
  const baseId = optionalText(params.base_id ?? params.baseId) || optionalText(credentials.baseId);
  if (!baseId) throw new Error(strings.errors.missingAirtableBase);
  return baseId;
}

function formatAirtableRecord(record) {
  const fields = Object.entries(record.fields ?? {})
    .slice(0, 8)
    .map(([key, value]) => `${key}: ${truncate(JSON.stringify(value), 160)}`)
    .join(' | ');
  return `${strings.output.id}: ${record.id}\n   ${fields || strings.output.emptyObject}`;
}

function formatSlackConversation(channel) {
  const flags = [
    channel.is_channel ? strings.output.conversationTypes.channel : null,
    channel.is_group ? strings.output.conversationTypes.group : null,
    channel.is_im ? strings.output.conversationTypes.dm : null,
    channel.is_private ? strings.output.conversationTypes.private : null,
  ]
    .filter(Boolean)
    .join(', ');
  return [
    `${channel.name ?? channel.user ?? channel.id}`,
    `${strings.output.id}: ${channel.id}`,
    flags ? `${strings.output.type}: ${flags}` : null,
  ]
    .filter(Boolean)
    .join('\n   ');
}

function formatTodoistTask(task) {
  return [
    task.content ?? task.id,
    `${strings.output.id}: ${task.id}`,
    task.due?.string ? `${strings.output.due}: ${task.due.string}` : null,
    task.project_id ? `${strings.output.project}: ${task.project_id}` : null,
  ]
    .filter(Boolean)
    .join('\n   ');
}

export function createProductivityToolHandlers({ rootDirectory }) {
  return {
    async slack_list_conversations(params = {}) {
      const limit = parseLimit(params.limit, 20, 1, 100);
      const types = optionalText(params.types) || 'public_channel,private_channel';
      const data = await slackRequest(rootDirectory, '/conversations.list', {
        searchParams: { limit, types },
      });
      return formatList(
        strings.output.slackConversations,
        (data.channels ?? []).map(formatSlackConversation),
      );
    },

    async slack_post_message(params = {}) {
      const channel = readText(params.channel, strings.labels.channel);
      const text = readText(params.text, strings.labels.text);
      const threadTs = optionalText(params.thread_ts ?? params.threadTs);
      const data = await slackRequest(rootDirectory, '/chat.postMessage', {
        method: 'POST',
        body: compactObject({ channel, text, thread_ts: threadTs || undefined }),
      });
      return [
        strings.output.slackPosted,
        `${strings.output.channel}: ${data.channel ?? channel}`,
        `${strings.output.timestamp}: ${data.ts ?? strings.output.notAvailable}`,
      ].join('\n');
    },

    async discord_send_message(params = {}) {
      const content = readText(params.content ?? params.text, strings.labels.content);
      const username = optionalText(params.username);
      const data = await discordRequest(rootDirectory, compactObject({ content, username }));
      return [
        strings.output.discordSent,
        `${strings.output.messageId}: ${data.id ?? strings.output.notAvailable}`,
        `${strings.output.channel}: ${data.channel_id ?? strings.output.notAvailable}`,
      ].join('\n');
    },

    async telegram_get_me() {
      const bot = await telegramRequest(rootDirectory, 'getMe');
      return [
        strings.output.telegramBot,
        `${strings.output.id}: ${bot.id ?? strings.output.notAvailable}`,
        `${strings.output.name}: ${bot.username ?? bot.first_name ?? strings.output.notAvailable}`,
      ].join('\n');
    },

    async telegram_send_message(params = {}) {
      const credentials = await requireConnectorCredentials(
        rootDirectory,
        'telegram',
        ['botToken'],
        connectorLabels.telegram,
      );
      const chatId =
        optionalText(params.chat_id ?? params.chatId) || optionalText(credentials.defaultChatId);
      if (!chatId) {
        throw new Error(strings.errors.missingParameter.replace('{label}', strings.labels.chatId));
      }
      const text = readText(params.text, strings.labels.text);
      const parseMode = optionalText(params.parse_mode ?? params.parseMode);
      const message = await telegramRequest(
        rootDirectory,
        'sendMessage',
        compactObject({ chat_id: chatId, text, parse_mode: parseMode || undefined }),
      );
      return [
        strings.output.telegramSent,
        `${strings.output.messageId}: ${message.message_id ?? strings.output.notAvailable}`,
        `${strings.output.chat}: ${message.chat?.id ?? chatId}`,
      ].join('\n');
    },

    async airtable_list_records(params = {}) {
      const table = readText(params.table, strings.labels.table);
      const baseId = await resolveAirtableBaseId(rootDirectory, params);
      const maxRecords = parseLimit(params.max_records ?? params.maxRecords, 10, 1, 100);
      const view = optionalText(params.view);
      const data = await airtableRequest(rootDirectory, baseId, table, {
        searchParams: { maxRecords, view },
      });
      return formatList(
        strings.output.airtableRecords,
        (data.records ?? []).map(formatAirtableRecord),
      );
    },

    async airtable_create_record(params = {}) {
      const table = readText(params.table, strings.labels.table);
      const baseId = await resolveAirtableBaseId(rootDirectory, params);
      const fields = parseObject(params.fields ?? params.fields_json, strings.labels.fields);
      const data = await airtableRequest(rootDirectory, baseId, table, {
        method: 'POST',
        body: {
          records: [{ fields }],
          typecast: toBoolean(params.typecast, false),
        },
      });
      const record = data.records?.[0] ?? {};
      return [
        strings.output.airtableCreated,
        `${strings.output.id}: ${record.id ?? strings.output.notAvailable}`,
        `${strings.output.created}: ${record.createdTime ?? strings.output.notAvailable}`,
      ].join('\n');
    },

    async todoist_filter_tasks(params = {}) {
      const query = readText(params.query, strings.labels.query);
      const limit = parseLimit(params.limit, 20, 1, 200);
      const lang = optionalText(params.lang) || 'en';
      const data = await todoistRequest(rootDirectory, '/tasks/filter', {
        searchParams: { query, lang, limit },
      });
      return formatList(strings.output.todoistTasks, (data.results ?? []).map(formatTodoistTask));
    },

    async todoist_quick_add(params = {}) {
      const text = readText(params.text, strings.labels.text);
      const note = optionalText(params.note);
      const reminder = optionalText(params.reminder);
      const data = await todoistRequest(rootDirectory, '/tasks/quick', {
        method: 'POST',
        body: compactObject({
          text,
          note: note || undefined,
          reminder: reminder || undefined,
          auto_reminder: toBoolean(params.auto_reminder ?? params.autoReminder, false),
          meta: toBoolean(params.meta, false),
        }),
      });
      return Object.keys(data).length
        ? [strings.output.todoistCreated, '', JSON.stringify(data, null, 2)].join('\n')
        : strings.output.todoistCreated;
    },

    async todoist_close_task(params = {}) {
      const taskId = encodeURIComponent(
        readText(params.task_id ?? params.taskId, strings.labels.taskId),
      );
      await todoistRequest(rootDirectory, `/tasks/${taskId}/close`, { method: 'POST' });
      return strings.output.todoistClosed;
    },
  };
}
