import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import https from 'node:https';
import http from 'node:http';
import { readProviderCatalog } from '../../Shared/ProviderCatalog/ProviderCatalog.js';
import { readUserState } from '../../Shared/UserData/UserData.js';
import { collapseWhitespace, truncate } from '../../Shared/Utils/StringUtils.js';

const openAiCompatibleProviders = new Set([
  'cerebras',
  'cohere',
  'deepseek',
  'google-openai',
  'groq',
  'lmstudio',
  'minimax',
  'mistral',
  'nvidia',
  'ollama',
  'openai',
  'openrouter',
  'perplexity',
  'together',
  'xai'
]);

function sanitizeConversationMessages(candidateMessages) {
  if (!Array.isArray(candidateMessages)) {
    return [];
  }

  return candidateMessages
    .map((message) => {
      const role = message?.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof message?.content === 'string' ? message.content.trim() : '';

      if (!content) {
        return null;
      }

      return {
        role,
        content
      };
    })
    .filter(Boolean);
}

function buildProviderOrder(user, providers) {
  const selectedProviderIds = Array.isArray(user?.providers?.selected) ? user.providers.selected : [];
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const orderedProviders = [];
  const seen = new Set();

  for (const providerId of selectedProviderIds) {
    const provider = providersById.get(providerId);

    if (provider && !seen.has(provider.id)) {
      orderedProviders.push(provider);
      seen.add(provider.id);
    }
  }

  for (const provider of providers) {
    if (!seen.has(provider.id)) {
      orderedProviders.push(provider);
      seen.add(provider.id);
    }
  }

  return orderedProviders;
}

function resolveProviderDetails(user, provider) {
  return user?.providers?.details?.[provider.id] ?? {};
}

function resolveProviderEndpoint(provider, providerDetails, modelId) {
  const configuredEndpoint = collapseWhitespace(providerDetails?.endpoint) || collapseWhitespace(provider.endpoint);

  if (!configuredEndpoint) {
    return '';
  }

  return modelId ? configuredEndpoint.replace('{model}', modelId) : configuredEndpoint;
}

function resolveCredential(provider, providerDetails) {
  if (!provider.requiresApiKey) {
    return '';
  }

  return collapseWhitespace(providerDetails?.apiKey);
}

function canUseProvider(user, provider) {
  const providerDetails = resolveProviderDetails(user, provider);
  const model = provider.models?.[0] ?? null;
  const endpoint = resolveProviderEndpoint(provider, providerDetails, model?.id ?? '');

  if (!endpoint) {
    return false;
  }

  if (provider.requiresApiKey && !resolveCredential(provider, providerDetails)) {
    return false;
  }

  return Boolean(model?.id);
}

function resolveActiveProvider(user, providers) {
  const orderedProviders = buildProviderOrder(user, providers);
  return orderedProviders.find((provider) => canUseProvider(user, provider)) ?? orderedProviders[0] ?? null;
}

function extractText(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractText(item))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  if (typeof value.text === 'string') {
    return value.text.trim();
  }

  if (typeof value.output_text === 'string') {
    return value.output_text.trim();
  }

  if (typeof value.content === 'string') {
    return value.content.trim();
  }

  if (Array.isArray(value.content)) {
    return extractText(value.content);
  }

  if (Array.isArray(value.parts)) {
    return extractText(value.parts);
  }

  if (value.message) {
    return extractText(value.message);
  }

  return '';
}

// ---------------------------------------------------------------------------
// Node.js HTTP helper — bypasses Electron's fetch buffering entirely.
// Returns a fetch-like response: { ok, status, statusText, text(), body }.
// body is the raw Node.js IncomingMessage (async-iterable, chunk by chunk).
// ---------------------------------------------------------------------------

function nodeRequest(urlString, { method = 'POST', headers = {}, body = '' } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;

    try {
      parsed = new URL(urlString);
    } catch (err) {
      return reject(new Error(`Invalid URL: ${urlString}`));
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const defaultPort = parsed.protocol === 'https:' ? 443 : 80;

    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : defaultPort,
        path: parsed.pathname + parsed.search,
        method,
        headers
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const statusText = res.statusMessage ?? '';

        resolve({
          status,
          statusText,
          ok: status >= 200 && status < 300,
          // Streaming: body IS the IncomingMessage (async-iterable)
          body: res,
          // Non-streaming: read everything as UTF-8 text
          text() {
            return new Promise((rs, rj) => {
              const parts = [];
              res.on('data', (chunk) => parts.push(chunk));
              res.on('end', () => rs(Buffer.concat(parts).toString('utf8')));
              res.on('error', rj);
            });
          }
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function parseResponse(response) {
  const rawText = await response.text();

  if (!rawText.trim()) {
    return { data: null, rawText: '' };
  }

  try {
    return { data: JSON.parse(rawText), rawText };
  } catch {
    return { data: null, rawText };
  }
}

function formatProviderError(response, data, rawText) {
  const message =
    extractText(data?.error) ||
    extractText(data?.message) ||
    extractText(data?.details) ||
    rawText.trim();

  if (message) {
    return `${response.status} ${response.statusText}: ${message}`;
  }

  return `${response.status} ${response.statusText}`;
}

// ---------------------------------------------------------------------------
// SSE streaming parser — reads directly from a Node.js IncomingMessage.
// Yields { event, data } for every complete SSE event.
// ---------------------------------------------------------------------------

async function* parseSSE(nodeResponse) {
  let buffer = '';
  let eventType = 'message';
  let dataLines = [];

  for await (const rawChunk of nodeResponse) {
    buffer += rawChunk.toString('utf8');

    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';

    for (const rawLine of parts) {
      const line = rawLine.replace(/\r$/, '');

      if (line === '') {
        if (dataLines.length > 0) {
          const payload = dataLines.join('\n');

          if (payload === '[DONE]') {
            return;
          }

          try {
            yield { event: eventType, data: JSON.parse(payload) };
          } catch {
            // Non-JSON keep-alive or comment line — skip
          }
        }

        eventType = 'message';
        dataLines = [];
      } else if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Streaming providers
// Each function reads the SSE stream and calls onChunk({ type, text }) for
// every text or thinking token that arrives.
// ---------------------------------------------------------------------------

async function streamGoogleMessage({ endpoint, provider, providerDetails, model, messages, onChunk }) {
  const apiKey = resolveCredential(provider, providerDetails);

  if (!apiKey) {
    throw new Error('Google API key is missing.');
  }

  // Swap generateContent → streamGenerateContent and request SSE format
  const streamEndpoint = endpoint.replace(':generateContent', ':streamGenerateContent');
  const streamUrl = streamEndpoint.includes('?')
    ? `${streamEndpoint}&alt=sse`
    : `${streamEndpoint}?alt=sse`;

  const streamBodyStr = JSON.stringify({
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    })),
    generationConfig: { temperature: 0.7 }
  });

  const response = await nodeRequest(streamUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(streamBodyStr),
      [provider.authHeader]: `${provider.authPrefix ?? ''}${apiKey}`
    },
    body: streamBodyStr
  });

  if (!response.ok) {
    const { data, rawText } = await parseResponse(response);
    throw new Error(formatProviderError(response, data, rawText));
  }

  for await (const { data } of parseSSE(response.body)) {
    if (!data || typeof data !== 'object') continue;

    const text = (data.candidates ?? [])
      .flatMap((candidate) => candidate?.content?.parts ?? [])
      .map((part) => extractText(part))
      .filter(Boolean)
      .join('');

    if (text) {
      onChunk({ type: 'text', text });
    }
  }
}

async function streamAnthropicMessage({ endpoint, provider, providerDetails, model, messages, onChunk }) {
  const apiKey = resolveCredential(provider, providerDetails);

  if (!apiKey) {
    throw new Error('Anthropic API key is missing.');
  }

  const supportsThinking = model.thinking === true;
  const thinkingBudget = model.thinking_budget ?? 8000;

  const requestBody = {
    model: model.id,
    max_tokens: Math.min(model.max_output ?? 16000, 16000),
    stream: true,
    messages: messages.map((message) => ({
      role: message.role,
      content: [{ type: 'text', text: message.content }]
    }))
  };

  if (supportsThinking) {
    requestBody.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
    // thinking requires a higher temperature than 1 isn't permitted — use default
    requestBody.temperature = 1;
  }

  const streamReqBodyStr = JSON.stringify(requestBody);

  const response = await nodeRequest(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(streamReqBodyStr),
      'anthropic-version': '2023-06-01',
      [provider.authHeader]: `${provider.authPrefix ?? ''}${apiKey}`
    },
    body: streamReqBodyStr
  });

  if (!response.ok) {
    const { data, rawText } = await parseResponse(response);
    throw new Error(formatProviderError(response, data, rawText));
  }

  for await (const { data } of parseSSE(response.body)) {
    if (!data || typeof data !== 'object') continue;

    if (data.type === 'content_block_delta') {
      const delta = data.delta;

      // Standard text token
      if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        onChunk({ type: 'text', text: delta.text });
      }

      // Extended thinking token (claude-3-7-sonnet, claude-4 with thinking enabled)
      if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
        onChunk({ type: 'thinking', text: delta.thinking });
      }
    } else if (data.type === 'error') {
      throw new Error(data.error?.message ?? 'Anthropic streaming error.');
    }
  }
}

async function streamOpenAiCompatibleMessage({ endpoint, provider, providerDetails, model, messages, onChunk }) {
  const headers = { 'content-type': 'application/json' };

  if (provider.requiresApiKey) {
    const apiKey = resolveCredential(provider, providerDetails);

    if (!apiKey) {
      throw new Error(`${provider.label} API key is missing.`);
    }

    headers[provider.authHeader] = `${provider.authPrefix ?? ''}${apiKey}`;
  }

  const streamOaiBodyStr = JSON.stringify({
    model: model.id,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content
    })),
    temperature: 0.7,
    stream: true
  });

  const response = await nodeRequest(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'content-length': Buffer.byteLength(streamOaiBodyStr)
    },
    body: streamOaiBodyStr
  });

  if (!response.ok) {
    const { data, rawText } = await parseResponse(response);
    throw new Error(formatProviderError(response, data, rawText));
  }

  for await (const { data } of parseSSE(response.body)) {
    if (!data || typeof data !== 'object') continue;

    const delta = data.choices?.[0]?.delta;
    if (!delta) continue;

    // Standard response text (all OpenAI-compatible providers)
    if (typeof delta.content === 'string' && delta.content) {
      onChunk({ type: 'text', text: delta.content });
    }

    // DeepSeek-R1 reasoning tokens and providers that follow the same pattern
    if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
      onChunk({ type: 'thinking', text: delta.reasoning_content });
    }

    // Some providers (e.g. Qwen-QwQ via OpenRouter) use a different field name
    if (typeof delta.reasoning === 'string' && delta.reasoning) {
      onChunk({ type: 'thinking', text: delta.reasoning });
    }
  }
}

async function requestChatCompletionStream({ user, providers, request, onChunk }) {
  const messages = sanitizeConversationMessages(request?.messages);

  if (messages.length === 0) {
    throw new Error('A message is required to start the chat.');
  }

  let provider = null;
  let model = null;

  if (request?.providerId && request?.modelId) {
    const requestedProvider = providers.find((p) => p.id === request.providerId) ?? null;
    const requestedModel = requestedProvider?.models?.find((m) => m.id === request.modelId) ?? null;

    if (requestedProvider && requestedModel) {
      provider = requestedProvider;
      model = requestedModel;
    }
  }

  if (!provider) {
    provider = resolveActiveProvider(user, providers);
  }

  if (!provider) {
    throw new Error('No AI providers are available yet. Complete provider setup first.');
  }

  const providerDetails = resolveProviderDetails(user, provider);

  if (!model) {
    model = provider.models?.[0] ?? null;
  }

  if (!model?.id) {
    throw new Error(`No model is configured for ${provider.label}.`);
  }

  const endpoint = resolveProviderEndpoint(provider, providerDetails, model.id);

  if (!endpoint) {
    throw new Error(`No endpoint is configured for ${provider.label}.`);
  }

  const meta = {
    providerId: provider.id,
    providerLabel: provider.label,
    modelId: model.id,
    modelLabel: model.name
  };

  if (provider.id === 'google') {
    await streamGoogleMessage({ endpoint, provider, providerDetails, model, messages, onChunk });
  } else if (provider.id === 'anthropic') {
    await streamAnthropicMessage({ endpoint, provider, providerDetails, model, messages, onChunk });
  } else if (openAiCompatibleProviders.has(provider.id)) {
    await streamOpenAiCompatibleMessage({ endpoint, provider, providerDetails, model, messages, onChunk });
  } else {
    throw new Error(`${provider.label} chat is not wired up yet.`);
  }

  return meta;
}

export function createChatStateManager({ rootDirectory }) {
  const chatsDirectory = path.join(rootDirectory, 'Data', 'Chats');

  return {
    async getBootstrapPayload() {
      const [user, providers] = await Promise.all([
        readUserState(rootDirectory),
        readProviderCatalog(rootDirectory)
      ]);

      return {
        user,
        providers,
        logoPath: pathToFileURL(path.join(rootDirectory, 'Assets', 'Logo', 'Logo.png')).href
      };
    },
    async saveSession(session) {
      if (!session?.id) return null;
      await mkdir(chatsDirectory, { recursive: true });
      const filePath = path.join(chatsDirectory, `${session.id}.json`);
      await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
      return session;
    },

    async listSessions() {
      let files;
      try {
        files = await readdir(chatsDirectory);
      } catch {
        return [];
      }

      const sessions = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await readFile(path.join(chatsDirectory, file), 'utf8');
          const session = JSON.parse(raw);
          sessions.push({
            id: session.id,
            title: session.title,
            pinned: session.pinned ?? false,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: Array.isArray(session.messages) ? session.messages.length : 0
          });
        } catch {
          // Skip corrupt or unreadable files silently
        }
      }

      return sessions.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    },

    async loadSession(id) {
      // Sanitize ID to prevent path traversal — only allow safe filename chars
      const safeId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
      const filePath = path.join(chatsDirectory, `${safeId}.json`);
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw);
    },

    async deleteSession(id) {
      const safeId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
      const filePath = path.join(chatsDirectory, `${safeId}.json`);
      await unlink(filePath);
    },

    async renameSession(id, newTitle) {
      const safeId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
      const filePath = path.join(chatsDirectory, `${safeId}.json`);
      const raw = await readFile(filePath, 'utf8');
      const session = JSON.parse(raw);
      session.title = String(newTitle).trim() || session.title;
      session.updatedAt = new Date().toISOString();
      await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
      return session;
    },

    async pinSession(id, pinned) {
      const safeId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
      const filePath = path.join(chatsDirectory, `${safeId}.json`);
      const raw = await readFile(filePath, 'utf8');
      const session = JSON.parse(raw);
      session.pinned = Boolean(pinned);
      await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
      return session;
    },

    // Streaming entry point — resolves once the stream ends (or rejects on error).
    // onChunk({ type: 'text'|'thinking', text }) is called for every token.
    // onDone(meta) is called when the stream completes successfully.
    // onError(error) is called if anything goes wrong.
    async streamMessage(request, { onChunk, onDone, onError }) {
      try {
        const [user, providers] = await Promise.all([
          readUserState(rootDirectory),
          readProviderCatalog(rootDirectory)
        ]);

        const meta = await requestChatCompletionStream({
          user,
          providers,
          request,
          onChunk
        });

        onDone(meta);
      } catch (error) {
        onError(error);
      }
    }
  };
}
