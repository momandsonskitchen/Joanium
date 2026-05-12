import https from 'node:https';
import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

// ---------------------------------------------------------------------------
// TTLs
// ---------------------------------------------------------------------------

const TTL_GREEN_MS = 24 * 60 * 60 * 1000;
const TTL_RED_MS = 6 * 60 * 60 * 1000;
const PROBE_TIMEOUT_MS = 15_000;

function isFresh(health) {
  if (!health?.checkedAt) return false;
  const age = Date.now() - new Date(health.checkedAt).getTime();
  if (health.status === 'green') return age < TTL_GREEN_MS;
  if (health.status === 'red') return age < TTL_RED_MS;
  return false;
}

// ---------------------------------------------------------------------------
// Health cache — one ModelHealth.json per provider folder.
// e.g. Data/Models/Nvidia/ModelHealth.json
// Provider JSON files are never mutated; they are read-only catalog data.
// Per-provider write locks ensure concurrent probes for different models
// of the same provider never interleave on disk.
// ---------------------------------------------------------------------------

const writeLocks = new Map();

function getProviderCachePath(rootDirectory, providerId) {
  const folderName = providerId.charAt(0).toUpperCase() + providerId.slice(1);
  return path.join(
    getWritableDataDirectory(rootDirectory),
    'Models',
    folderName,
    'ModelHealth.json',
  );
}

async function readProviderHealth(rootDirectory, providerId) {
  try {
    const raw = await readFile(getProviderCachePath(rootDirectory, providerId), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeProviderHealth(rootDirectory, providerId, data) {
  const lock = writeLocks.get(providerId) ?? Promise.resolve();
  const next = lock.then(async () => {
    try {
      const cachePath = getProviderCachePath(rootDirectory, providerId);
      await mkdir(path.dirname(cachePath), { recursive: true });
      await writeFile(cachePath, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Non-fatal.
    }
  });
  writeLocks.set(providerId, next);
  return next;
}

// ---------------------------------------------------------------------------
// Minimal HTTP probe
// ---------------------------------------------------------------------------

function minimalRequest(urlString, { headers = {}, body = '' } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;

    try {
      parsed = new URL(urlString);
    } catch (err) {
      return reject(err);
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;

    const req = client.request(
      {
        hostname: parsed.hostname,
        port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }),
        );
        res.on('error', reject);
      },
    );

    req.setTimeout(PROBE_TIMEOUT_MS, () => req.destroy(new Error('probe_timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Response classifier
// ---------------------------------------------------------------------------

const NOT_FOUND_SIGNALS = [
  'model not found',
  'model_not_found',
  'does not exist',
  'no such model',
  'invalid model',
  'not supported',
  'no endpoints found',
  'unknown model',
  'model is not available',
  'model has been deprecated',
  'deprecated',
  'has been removed',
  'is not a valid model',
  'model does not exist',
];

function classify(status, bodyText) {
  if (status >= 200 && status < 300) return 'green';
  if (status === 429) return 'green';
  if (status === 401 || status === 403) return 'yellow';
  if (status === 404) return 'red';

  if (status === 400 || status === 422) {
    const lower = bodyText.toLowerCase();
    if (NOT_FOUND_SIGNALS.some((s) => lower.includes(s))) return 'red';
    return 'yellow';
  }

  if (status >= 500) return 'yellow';
  return 'yellow';
}

// ---------------------------------------------------------------------------
// Probe builders
// ---------------------------------------------------------------------------

function resolveEndpoint(provider, details, modelId) {
  const base = details?.endpoint?.trim() || provider.endpoint?.trim() || '';
  if (!base) return '';
  return modelId ? base.replace('{model}', modelId) : base;
}

function resolveApiKey(provider, details) {
  if (!provider.requiresApiKey) return '';
  return details?.apiKey?.trim() ?? '';
}

async function probeModel(provider, model, details) {
  const endpoint = resolveEndpoint(provider, details, model.id);
  if (!endpoint) return 'yellow';

  try {
    let headers = { 'content-type': 'application/json' };
    let bodyObj;

    if (provider.id === 'anthropic') {
      const key = resolveApiKey(provider, details);
      if (!key) return 'yellow';
      headers[provider.authHeader] = `${provider.authPrefix ?? ''}${key}`;
      headers['anthropic-version'] = '2023-06-01';
      bodyObj = { model: model.id, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] };
    } else if (provider.id === 'google') {
      const key = resolveApiKey(provider, details);
      if (!key) return 'yellow';
      headers[provider.authHeader] = `${provider.authPrefix ?? ''}${key}`;
      bodyObj = {
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 1 },
      };
    } else {
      if (provider.requiresApiKey) {
        const key = resolveApiKey(provider, details);
        if (!key) return 'yellow';
        headers[provider.authHeader] = `${provider.authPrefix ?? ''}${key}`;
      }
      bodyObj = {
        model: model.id,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      };
    }

    const bodyStr = JSON.stringify(bodyObj);
    headers['content-length'] = Buffer.byteLength(bodyStr);

    const { status, body } = await minimalRequest(endpoint, { headers, body: bodyStr });
    return classify(status, body);
  } catch {
    return 'yellow';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createModelHealthChecker({ rootDirectory }) {
  return {
    // Returns a flat map of { "providerId/modelId": "green"|"yellow"|"red" }
    async getHealthMap(providers) {
      const result = {};

      await Promise.all(
        providers.map(async (provider) => {
          const cache = await readProviderHealth(rootDirectory, provider.id);
          for (const model of provider.models ?? []) {
            const key = `${provider.id}/${model.id}`;
            const health = cache[model.id] ?? null;
            result[key] = isFresh(health) ? health.status : 'yellow';
          }
        }),
      );

      return result;
    },

    // Probes a single model, writes result into the provider ModelHealth.json, returns { key, status }.
    async probeAndCache(provider, model, providerDetails) {
      const key = `${provider.id}/${model.id}`;
      const status = await probeModel(provider, model, providerDetails);

      try {
        const cache = await readProviderHealth(rootDirectory, provider.id);
        cache[model.id] = { status, checkedAt: new Date().toISOString() };
        await writeProviderHealth(rootDirectory, provider.id, cache);
      } catch {
        // Non-fatal.
      }

      return { key, status };
    },
  };
}
