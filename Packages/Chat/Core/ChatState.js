import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readProviderCatalog } from '../../Shared/ProviderCatalog/ProviderCatalog.js';
import { readUserState } from '../../Shared/UserData/UserData.js';

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

function collapseWhitespace(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function sanitizeRecentPrompt(candidate) {
  const prompt = collapseWhitespace(candidate?.prompt);

  if (!prompt) {
    return null;
  }

  const title = collapseWhitespace(candidate?.title) || truncate(prompt, 42);
  const summary = collapseWhitespace(candidate?.summary) || truncate(prompt, 88);
  const updatedAt = typeof candidate?.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString();

  return {
    title: truncate(title, 48),
    summary: truncate(summary, 112),
    prompt,
    updatedAt
  };
}

function sanitizeHomeState(candidateState) {
  if (!candidateState || typeof candidateState !== 'object') {
    return { recentPrompts: [] };
  }

  const recentPrompts = Array.isArray(candidateState.recentPrompts)
    ? candidateState.recentPrompts.map(sanitizeRecentPrompt).filter(Boolean).slice(0, 6)
    : [];

  return { recentPrompts };
}

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

async function parseResponse(response) {
  const rawText = await response.text();

  if (!rawText.trim()) {
    return {
      data: null,
      rawText: ''
    };
  }

  try {
    return {
      data: JSON.parse(rawText),
      rawText
    };
  } catch {
    return {
      data: null,
      rawText
    };
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
// SSE streaming parser
// Handles Anthropic, OpenAI-compatible, and Google Gemini event streams.
// Yields { event: string, data: object } for each dispatched SSE event.
// ---------------------------------------------------------------------------

async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventType = 'message';
  let dataLines = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';

      for (const rawLine of parts) {
        const line = rawLine.replace(/\r$/, '');

        if (line === '') {
          // Empty line = dispatch accumulated event
          if (dataLines.length > 0) {
            const payload = dataLines.join('\n');

            if (payload === '[DONE]') {
              return;
            }

            try {
              yield { event: eventType, data: JSON.parse(payload) };
            } catch {
              // Non-JSON data lines (e.g. keep-alive comments) — skip
            }
          }

          eventType = 'message';
          dataLines = [];
        } else if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
        // id: and retry: fields are intentionally ignored
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Non-streaming providers (kept for reference / fallback)
// ---------------------------------------------------------------------------

async function sendGoogleMessage({ endpoint, provider, providerDetails, model, messages }) {
  const apiKey = resolveCredential(provider, providerDetails);

  if (!apiKey) {
    throw new Error('Google API key is missing.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [provider.authHeader]: `${provider.authPrefix ?? ''}${apiKey}`
    },
    body: JSON.stringify({
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [
          {
            text: message.content
          }
        ]
      })),
      generationConfig: {
        temperature: 0.7
      }
    })
  });

  const { data, rawText } = await parseResponse(response);

  if (!response.ok) {
    throw new Error(formatProviderError(response, data, rawText));
  }

  const reply =
    data?.candidates
      ?.flatMap((candidate) => candidate?.content?.parts ?? [])
      .map((part) => extractText(part))
      .filter(Boolean)
      .join('\n')
      .trim() ?? '';

  if (!reply) {
    throw new Error('Google returned an empty response.');
  }

  return {
    message: reply,
    providerId: provider.id,
    providerLabel: provider.label,
    modelId: model.id,
    modelLabel: model.name
  };
}

async function sendAnthropicMessage({ endpoint, provider, providerDetails, model, messages }) {
  const apiKey = resolveCredential(provider, providerDetails);

  if (!apiKey) {
    throw new Error('Anthropic API key is missing.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      [provider.authHeader]: `${provider.authPrefix ?? ''}${apiKey}`
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: Math.min(model.max_output ?? 4096, 4096),
      messages: messages.map((message) => ({
        role: message.role,
        content: [
          {
            type: 'text',
            text: message.content
          }
        ]
      }))
    })
  });

  const { data, rawText } = await parseResponse(response);

  if (!response.ok) {
    throw new Error(formatProviderError(response, data, rawText));
  }

  const reply = extractText(data?.content);

  if (!reply) {
    throw new Error('Anthropic returned an empty response.');
  }

  return {
    message: reply,
    providerId: provider.id,
    providerLabel: provider.label,
    modelId: model.id,
    modelLabel: model.name
  };
}

async function sendOpenAiCompatibleMessage({ endpoint, provider, providerDetails, model, messages }) {
  const headers = {
    'content-type': 'application/json'
  };

  if (provider.requiresApiKey) {
    const apiKey = resolveCredential(provider, providerDetails);

    if (!apiKey) {
      throw new Error(`${provider.label} API key is missing.`);
    }

    headers[provider.authHeader] = `${provider.authPrefix ?? ''}${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.id,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      temperature: 0.7
    })
  });

  const { data, rawText } = await parseResponse(response);

  if (!response.ok) {
    throw new Error(formatProviderError(response, data, rawText));
  }

  const reply = extractText(data?.choices?.[0]?.message?.content) || extractText(data?.output);

  if (!reply) {
    throw new Error(`${provider.label} returned an empty response.`);
  }

  return {
    message: reply,
    providerId: provider.id,
    providerLabel: provider.label,
    modelId: model.id,
    modelLabel: model.name
  };
}

async function requestChatCompletion({ user, providers, request }) {
  const messages = sanitizeConversationMessages(request?.messages);

  if (messages.length === 0) {
    throw new Error('A message is required to start the chat.');
  }

  // Honour an explicit provider + model selection from the UI.
  // Falls back to automatic resolution when the IDs are absent or stale.
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

  if (provider.id === 'google') {
    return sendGoogleMessage({ endpoint, provider, providerDetails, model, messages });
  }

  if (provider.id === 'anthropic') {
    return sendAnthropicMessage({ endpoint, provider, providerDetails, model, messages });
  }

  if (openAiCompatibleProviders.has(provider.id)) {
    return sendOpenAiCompatibleMessage({ endpoint, provider, providerDetails, model, messages });
  }

  throw new Error(`${provider.label} chat is not wired up yet.`);
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

  const response = await fetch(streamUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [provider.authHeader]: `${provider.authPrefix ?? ''}${apiKey}`
    },
    body: JSON.stringify({
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      })),
      generationConfig: { temperature: 0.7 }
    })
  });

  if (!response.ok) {
    const { data, rawText } = await parseResponse(response);
    throw new Error(formatProviderError(response, data, rawText));
  }

  for await (const { data } of parseSSE(response)) {
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      [provider.authHeader]: `${provider.authPrefix ?? ''}${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const { data, rawText } = await parseResponse(response);
    throw new Error(formatProviderError(response, data, rawText));
  }

  for await (const { data } of parseSSE(response)) {
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.id,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      temperature: 0.7,
      stream: true
    })
  });

  if (!response.ok) {
    const { data, rawText } = await parseResponse(response);
    throw new Error(formatProviderError(response, data, rawText));
  }

  for await (const { data } of parseSSE(response)) {
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
  const homeFilePath = path.join(rootDirectory, 'Data', 'Chat', 'Home.json');

  async function readHomeState() {
    try {
      const fileContents = await readFile(homeFilePath, 'utf8');

      if (!fileContents.trim()) {
        return { recentPrompts: [] };
      }

      return sanitizeHomeState(JSON.parse(fileContents));
    } catch {
      return { recentPrompts: [] };
    }
  }

  async function writeHomeState(nextState) {
    await mkdir(path.dirname(homeFilePath), { recursive: true });
    await writeFile(homeFilePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
    return nextState;
  }

  return {
    async getBootstrapPayload() {
      const [user, providers, home] = await Promise.all([
        readUserState(rootDirectory),
        readProviderCatalog(rootDirectory),
        readHomeState()
      ]);

      return {
        user,
        providers,
        home,
        logoPath: pathToFileURL(path.join(rootDirectory, 'Assets', 'Logo', 'Logo.png')).href
      };
    },
    async saveRecentPrompt(promptEntry) {
      const nextEntry = sanitizeRecentPrompt(promptEntry);
      const currentState = await readHomeState();

      if (!nextEntry) {
        return currentState;
      }

      const dedupedPrompts = currentState.recentPrompts.filter((item) => {
        return item.prompt !== nextEntry.prompt && item.title.toLowerCase() !== nextEntry.title.toLowerCase();
      });

      const nextState = {
        recentPrompts: [nextEntry, ...dedupedPrompts].slice(0, 6)
      };

      return writeHomeState(nextState);
    },
    async sendMessage(request) {
      const [user, providers] = await Promise.all([
        readUserState(rootDirectory),
        readProviderCatalog(rootDirectory)
      ]);

      return requestChatCompletion({
        user,
        providers,
        request
      });
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
