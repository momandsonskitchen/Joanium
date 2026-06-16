import path from 'node:path';
import { mkdir, readFile, writeFile, readdir, unlink, rm } from 'node:fs/promises';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { serializeJson } from '../../Shared/Storage/JsonFileStore.js';
import { deepClone } from '../../Shared/Utils/ValueUtils.js';
import { normalizeString } from '../../Shared/Utils/StringUtils.js';
import { toIso } from '../../Shared/Utils/DateUtils.js';

const DEFAULT_CHANNELS = Object.freeze({
  telegram: {
    enabled: false,
    botToken: '',
    systemPrompt: '',
    lastUpdateId: 0,
    connectedAt: null,
  },
  whatsapp: {
    enabled: false,
    accountSid: '',
    authToken: '',
    fromNumber: '',
    systemPrompt: '',
    connectedAt: null,
  },
  discord: {
    enabled: false,
    botToken: '',
    channelId: '',
    systemPrompt: '',
    lastMessageId: null,
    connectedAt: null,
  },
  slack: {
    enabled: false,
    botToken: '',
    channelId: '',
    systemPrompt: '',
    lastMessageTs: null,
    connectedAt: null,
  },
  zulip: {
    enabled: false,
    siteUrl: '',
    email: '',
    apiKey: '',
    stream: '',
    topic: '',
    systemPrompt: '',
    lastMessageId: null,
    connectedAt: null,
  },
  mattermost: {
    enabled: false,
    siteUrl: '',
    accessToken: '',
    channelId: '',
    userId: '',
    systemPrompt: '',
    lastPostCreateAt: null,
    connectedAt: null,
  },
  ntfy: {
    enabled: false,
    siteUrl: 'https://ntfy.sh',
    topic: '',
    systemPrompt: '',
    lastMessageId: null,
    connectedAt: null,
  },
});

const CHANNEL_NAMES = Object.keys(DEFAULT_CHANNELS);
const MESSAGE_LIMIT = 500;

function createMessageId() {
  return `channel-message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeChannels(candidate) {
  const source =
    candidate?.channels && typeof candidate.channels === 'object' ? candidate.channels : {};
  const channels = {};

  for (const name of CHANNEL_NAMES) {
    const defaults = DEFAULT_CHANNELS[name];
    const existing = source[name] && typeof source[name] === 'object' ? source[name] : {};
    channels[name] = { ...deepClone(defaults), ...existing };
    channels[name].enabled = Boolean(channels[name].enabled);
    channels[name].connectedAt = channels[name].connectedAt ?? null;
  }

  return { channels };
}

function sanitizeMessage(message = {}) {
  const repliedAt = toIso(message.repliedAt ?? message.timestamp);
  const receivedAt = toIso(message.receivedAt ?? repliedAt, repliedAt);

  return {
    id: message.id ? normalizeString(message.id) : createMessageId(),
    channel: normalizeString(message.channel),
    from: normalizeString(message.from) || 'User',
    incoming: normalizeString(message.incoming),
    reply: normalizeString(message.reply),
    status: message.status === 'error' ? 'error' : 'success',
    error: message.error ? normalizeString(message.error) : null,
    provider: message.provider ? normalizeString(message.provider) : null,
    model: message.model ? normalizeString(message.model) : null,
    receivedAt,
    repliedAt,
    timestamp: repliedAt,
    externalId: message.externalId ? normalizeString(message.externalId) : null,
    targetId: message.targetId ? normalizeString(message.targetId) : null,
    conversationId: message.conversationId ? normalizeString(message.conversationId) : null,
  };
}

function safeChannelConfig(name, config) {
  const safe = {
    enabled: Boolean(config?.enabled),
    configured: isConfigured(name, config),
    connectedAt: config?.connectedAt ?? null,
    systemPrompt: normalizeString(config?.systemPrompt),
  };

  if (name === 'telegram') {
    safe.botTokenSet = Boolean(config?.botToken);
  }

  if (name === 'whatsapp') {
    safe.accountSidSet = Boolean(config?.accountSid);
    safe.authTokenSet = Boolean(config?.authToken);
    safe.fromNumber = config?.fromNumber ?? '';
  }

  if (name === 'discord' || name === 'slack') {
    safe.botTokenSet = Boolean(config?.botToken);
    safe.channelId = config?.channelId ?? '';
  }

  if (name === 'zulip') {
    safe.siteUrl = config?.siteUrl ?? '';
    safe.email = config?.email ?? '';
    safe.apiKeySet = Boolean(config?.apiKey);
    safe.stream = config?.stream ?? '';
    safe.topic = config?.topic ?? '';
  }

  if (name === 'mattermost') {
    safe.siteUrl = config?.siteUrl ?? '';
    safe.accessTokenSet = Boolean(config?.accessToken);
    safe.channelId = config?.channelId ?? '';
  }

  if (name === 'ntfy') {
    safe.siteUrl = config?.siteUrl ?? '';
    safe.topic = config?.topic ?? '';
  }

  return safe;
}

export function isConfigured(name, config) {
  if (name === 'telegram') {
    return Boolean(config?.botToken);
  }

  if (name === 'whatsapp') {
    return Boolean(config?.accountSid && config?.authToken && config?.fromNumber);
  }

  if (name === 'discord' || name === 'slack') {
    return Boolean(config?.botToken && config?.channelId);
  }

  if (name === 'zulip') {
    return Boolean(config?.siteUrl && config?.email && config?.apiKey && config?.stream);
  }

  if (name === 'mattermost') {
    return Boolean(config?.siteUrl && config?.accessToken && config?.channelId);
  }

  if (name === 'ntfy') {
    return Boolean(config?.siteUrl && config?.topic);
  }

  return false;
}

export function createChannelStateManager({ rootDirectory }) {
  const dataDirectory = getWritableDataDirectory(rootDirectory);
  const channelsFilePath = path.join(dataDirectory, 'Channels.json');
  const messagesRootDir = path.join(dataDirectory, 'ChannelMessages');

  async function readChannels() {
    try {
      const raw = await readFile(channelsFilePath, 'utf8');
      return normalizeChannels(JSON.parse(raw));
    } catch {
      return normalizeChannels(null);
    }
  }

  async function writeChannels(data) {
    await mkdir(path.dirname(channelsFilePath), { recursive: true });
    await writeFile(channelsFilePath, serializeJson(normalizeChannels(data)), 'utf8');
  }

  async function readChannelMessages(channelName) {
    const dir = path.join(messagesRootDir, channelName);
    try {
      const files = await readdir(dir);
      const jsonFiles = files
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse();
      const messages = [];

      for (const file of jsonFiles.slice(0, MESSAGE_LIMIT)) {
        try {
          const raw = await readFile(path.join(dir, file), 'utf8');
          const parsed = JSON.parse(raw);
          messages.push(sanitizeMessage(parsed));
        } catch {
          // Skip unreadable files
        }
      }

      return messages;
    } catch {
      return [];
    }
  }

  async function readAllMessages() {
    const allMessages = [];
    for (const name of CHANNEL_NAMES) {
      const messages = await readChannelMessages(name);
      allMessages.push(...messages);
    }
    return allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async function updateChannel(name, updater) {
    if (!CHANNEL_NAMES.includes(name)) {
      throw new Error('Unknown channel.');
    }

    const data = await readChannels();
    const current = data.channels[name];
    data.channels[name] = updater({ ...current });
    await writeChannels(data);
    return data.channels[name];
  }

  return {
    async getAllChannels() {
      const data = await readChannels();
      return Object.fromEntries(
        CHANNEL_NAMES.map((name) => [name, safeChannelConfig(name, data.channels[name])]),
      );
    },

    async getChannel(name) {
      if (!CHANNEL_NAMES.includes(name)) return null;
      const data = await readChannels();
      return data.channels[name] ?? null;
    },

    async getSafeChannel(name) {
      const channel = await this.getChannel(name);
      return channel ? safeChannelConfig(name, channel) : null;
    },

    async saveChannel(name, config = {}) {
      const saved = await updateChannel(name, (current) => {
        const next = { ...current };

        for (const key of Object.keys(DEFAULT_CHANNELS[name])) {
          if (config[key] !== undefined) {
            if (typeof DEFAULT_CHANNELS[name][key] === 'boolean') {
              next[key] = Boolean(config[key]);
            } else {
              next[key] = typeof config[key] === 'string' ? config[key].trim() : config[key];
            }
          }
        }

        next.enabled = true;
        next.connectedAt = new Date().toISOString();
        return next;
      });

      return safeChannelConfig(name, saved);
    },

    async removeChannel(name) {
      await updateChannel(name, () => ({ ...deepClone(DEFAULT_CHANNELS[name]), enabled: false }));
      return { ok: true };
    },

    async toggleChannel(name, enabled) {
      const updated = await updateChannel(name, (current) => ({
        ...current,
        enabled: Boolean(enabled),
      }));
      return safeChannelConfig(name, updated);
    },

    async updateRuntimeState(name, patch) {
      await updateChannel(name, (current) => ({ ...current, ...patch }));
    },

    async listMessages() {
      return readAllMessages();
    },

    async saveMessage(message) {
      const normalized = sanitizeMessage(message);
      const channelName = normalized.channel;
      if (!channelName || !CHANNEL_NAMES.includes(channelName)) {
        throw new Error('Invalid channel name.');
      }

      const dir = path.join(messagesRootDir, channelName);
      await mkdir(dir, { recursive: true });

      const dateStr = new Date(normalized.timestamp).toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(dir, `${dateStr}.json`);
      await writeFile(filePath, serializeJson(normalized), 'utf8');

      return normalized;
    },

    async deleteMessage(id) {
      const safeId = normalizeString(id);
      for (const name of CHANNEL_NAMES) {
        const dir = path.join(messagesRootDir, name);
        try {
          const files = await readdir(dir);
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
              const raw = await readFile(path.join(dir, file), 'utf8');
              const parsed = JSON.parse(raw);
              if (parsed.id === safeId) {
                await unlink(path.join(dir, file));
                return { ok: true };
              }
            } catch {
              // Skip unreadable files
            }
          }
        } catch {
          // Directory doesn't exist, continue
        }
      }
      return { ok: true };
    },

    async clearMessages() {
      try {
        await rm(messagesRootDir, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist
      }
      return { ok: true };
    },
  };
}
