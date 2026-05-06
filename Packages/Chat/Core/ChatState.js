import https from 'node:https';
import http from 'node:http';
import { readProviderCatalog } from '../../Shared/ProviderCatalog/ProviderCatalog.js';
import { readUserState } from '../../Shared/UserData/UserData.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';

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

    // Keep the TCP connection alive so routers / NATs don't silently drop long
    // streaming responses before the model finishes generating.
    req.on('socket', (socket) => {
      socket.setKeepAlive(true, 30_000);
    });

    // Hard ceiling — destroy the request if no response arrives within 3 minutes.
    req.setTimeout(180_000, () => {
      req.destroy(Object.assign(new Error('The request timed out. Please try again.'), { code: 'ETIMEDOUT' }));
    });

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

async function streamGoogleMessage({ endpoint, provider, providerDetails, model, messages, systemPrompt, onChunk }) {
  const apiKey = resolveCredential(provider, providerDetails);

  if (!apiKey) {
    throw new Error('Google API key is missing.');
  }

  // Swap generateContent → streamGenerateContent and request SSE format
  const streamEndpoint = endpoint.replace(':generateContent', ':streamGenerateContent');
  const streamUrl = streamEndpoint.includes('?')
    ? `${streamEndpoint}&alt=sse`
    : `${streamEndpoint}?alt=sse`;

  const googleBody = {
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    })),
    generationConfig: { temperature: 0.7 }
  };

  if (systemPrompt) {
    googleBody.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const streamBodyStr = JSON.stringify(googleBody);

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

async function streamAnthropicMessage({ endpoint, provider, providerDetails, model, messages, systemPrompt, onChunk }) {
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

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

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

async function streamOpenAiCompatibleMessage({ endpoint, provider, providerDetails, model, messages, systemPrompt, onChunk }) {
  const headers = { 'content-type': 'application/json' };

  if (provider.requiresApiKey) {
    const apiKey = resolveCredential(provider, providerDetails);

    if (!apiKey) {
      throw new Error(`${provider.label} API key is missing.`);
    }

    headers[provider.authHeader] = `${provider.authPrefix ?? ''}${apiKey}`;
  }

  const oaiMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const streamOaiBodyStr = JSON.stringify({
    model: model.id,
    messages: oaiMessages.map((message) => ({
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
  const messages     = sanitizeConversationMessages(request?.messages);
  const parts = [];
  if (typeof request?.persona === 'string' && request.persona.trim()) {
    parts.push(request.persona.trim());
  }
  if (typeof request?.projectInfo === 'string' && request.projectInfo.trim()) {
    parts.push(request.projectInfo.trim());
  }

  const systemPrompt = parts.length > 0 ? parts.join('\n\n') : null;

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

  // Estimate input character count across all messages + system prompt.
  const charCountIn = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0)
    + (systemPrompt?.length ?? 0);

  // Wrap onChunk to accumulate output character count.
  let charCountOut = 0;
  const trackingChunk = (chunk) => {
    if (chunk?.type === 'text' && typeof chunk.text === 'string') {
      charCountOut += chunk.text.length;
    }
    onChunk(chunk);
  };

  if (provider.id === 'google') {
    await streamGoogleMessage({ endpoint, provider, providerDetails, model, messages, systemPrompt, onChunk: trackingChunk });
  } else if (provider.id === 'anthropic') {
    await streamAnthropicMessage({ endpoint, provider, providerDetails, model, messages, systemPrompt, onChunk: trackingChunk });
  } else if (openAiCompatibleProviders.has(provider.id)) {
    await streamOpenAiCompatibleMessage({ endpoint, provider, providerDetails, model, messages, systemPrompt, onChunk: trackingChunk });
  } else {
    throw new Error(`${provider.label} chat is not wired up yet.`);
  }

  return { ...meta, charCountIn, charCountOut };
}

export function createChatStateManager({ rootDirectory }) {
  return {
    async getBootstrapPayload() {
      const [user, providers] = await Promise.all([
        readUserState(rootDirectory),
        readProviderCatalog(rootDirectory)
      ]);

      return { user, providers };
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
    },

  };
}
