import https from 'node:https';
import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

// ---------------------------------------------------------------------------
// TTLs
// ---------------------------------------------------------------------------

const TTL_GREEN_MS     = 24 * 60 * 60 * 1000;
const TTL_RED_MS       =  6 * 60 * 60 * 1000;
const PROBE_TIMEOUT_MS = 15_000;

function isFresh(health) {
  if (!health?.checkedAt) return false;
  const age = Date.now() - new Date(health.checkedAt).getTime();
  if (health.status === 'green') return age < TTL_GREEN_MS;
  if (health.status === 'red')   return age < TTL_RED_MS;
  return false;
}

// ---------------------------------------------------------------------------
// Provider file resolver
// Scans index.json once and caches a map of providerId -> file path.
// ---------------------------------------------------------------------------

let fileMapCache = null;

async function buildFileMap(rootDirectory) {
  if (fileMapCache) return fileMapCache;

  const modelsDir  = path.join(rootDirectory, 'Data', 'Models');
  const indexPath  = path.join(modelsDir, 'index.json');
  const fileNames  = JSON.parse(await readFile(indexPath, 'utf8'));
  const map        = new Map();

  for (const fileName of fileNames) {
    const name     = path.basename(fileName, '.json');
    const filePath = path.join(modelsDir, name, fileName);
    const raw      = await readFile(filePath, 'utf8');
    const json     = JSON.parse(raw);
    map.set(json.provider, { filePath, json });
  }

  fileMapCache = map;
  return map;
}

async function readProviderFile(rootDirectory, providerId) {
  const map   = await buildFileMap(rootDirectory);
  const entry = map.get(providerId);
  if (!entry) return null;

  // Always re-read to get latest — another write may have happened.
  const raw = await readFile(entry.filePath, 'utf8');
  return { filePath: entry.filePath, json: JSON.parse(raw) };
}

async function writeProviderFile(filePath, json) {
  await writeFile(filePath, JSON.stringify(json, null, 2), 'utf8');
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
    const port   = parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);

    const req = client.request(
      {
        hostname: parsed.hostname,
        port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers
      },
      (res) => {
        const chunks = [];
        res.on('data',  (chunk) => chunks.push(chunk));
        res.on('end',   () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      }
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
  'model not found', 'model_not_found', 'does not exist',
  'no such model', 'invalid model', 'not supported',
  'no endpoints found', 'unknown model', 'model is not available',
  'model has been deprecated', 'deprecated', 'has been removed',
  'is not a valid model', 'model does not exist'
];

function classify(status, bodyText) {
  if (status >= 200 && status < 300) return 'green';
  if (status === 429)                 return 'green';
  if (status === 401 || status === 403) return 'yellow';
  if (status === 404)                 return 'red';

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
        generationConfig: { maxOutputTokens: 1 }
      };

    } else {
      if (provider.requiresApiKey) {
        const key = resolveApiKey(provider, details);
        if (!key) return 'yellow';
        headers[provider.authHeader] = `${provider.authPrefix ?? ''}${key}`;
      }
      bodyObj = { model: model.id, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }], stream: false };
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

      for (const provider of providers) {
        const file = await readProviderFile(rootDirectory, provider.id).catch(() => null);

        for (const model of provider.models ?? []) {
          const key    = `${provider.id}/${model.id}`;
          const health = file?.json?.models?.[model.id]?.health ?? null;
          result[key]  = isFresh(health) ? health.status : 'yellow';
        }
      }

      return result;
    },

    // Probes a single model, writes result back into the provider JSON, returns { key, status }.
    async probeAndCache(provider, model, providerDetails) {
      const key    = `${provider.id}/${model.id}`;
      const status = await probeModel(provider, model, providerDetails);

      try {
        const file = await readProviderFile(rootDirectory, provider.id);
        if (file && file.json.models?.[model.id]) {
          file.json.models[model.id].health = { status, checkedAt: new Date().toISOString() };
          await writeProviderFile(file.filePath, file.json);
        }
      } catch {
        // Non-fatal — result still returned even if we couldn't persist.
      }

      return { key, status };
    }
  };
}
