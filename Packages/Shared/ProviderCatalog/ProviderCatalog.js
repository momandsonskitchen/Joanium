import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const providerPalette = {
  anthropic: { tint: '#f6c59e', glow: '#ffefe0' },
  cerebras: { tint: '#ffa9b8', glow: '#ffe3e8' },
  cohere: { tint: '#f1b38b', glow: '#fff0e2' },
  deepseek: { tint: '#7fa7ff', glow: '#e4ecff' },
  fireworks: { tint: '#b89aee', glow: '#ede7ff' },
  google: { tint: '#7f97ff', glow: '#edf1ff' },
  githubmodels: { tint: '#6e7681', glow: '#eef1f4' },
  groq: { tint: '#f5a876', glow: '#ffebdd' },
  huggingface: { tint: '#f6c860', glow: '#fff6d7' },
  hyperbolic: { tint: '#9e96f5', glow: '#edeaff' },
  moonshot: { tint: '#94c9ff', glow: '#eaf5ff' },
  lambda: { tint: '#a5a8f5', glow: '#eeeeff' },
  lmstudio: { tint: '#ff9f84', glow: '#ffe8df' },
  minimax: { tint: '#ef8fd2', glow: '#ffebf8' },
  mistral: { tint: '#ffb16a', glow: '#fff0df' },
  nvidia: { tint: '#8ecf82', glow: '#ebf8e7' },
  novita: { tint: '#7bb7ff', glow: '#e8f3ff' },
  ollama: { tint: '#9cb8ff', glow: '#eef3ff' },
  openai: { tint: '#8fd0bc', glow: '#ebfaf4' },
  openrouter: { tint: '#c7a8ff', glow: '#f3ecff' },
  perplexity: { tint: '#8fc7ff', glow: '#eaf5ff' },
  requesty: { tint: '#6dd6a5', glow: '#e4f9ef' },
  sambanova: { tint: '#ffb88a', glow: '#fff3e8' },
  siliconflow: { tint: '#7cc6b3', glow: '#e6f8f2' },
  ai21: { tint: '#ff9ab5', glow: '#ffe6ee' },
  together: { tint: '#ff9a9a', glow: '#ffebeb' },
  vercelaigateway: { tint: '#94a3b8', glow: '#edf2f7' },
  xai: { tint: '#c9b6a8', glow: '#f4eee9' },
  zai: { tint: '#9ab4ff', glow: '#edf2ff' },
  alibaba: { tint: '#ff7b00', glow: '#fff1e0' },
  mulerouter: { tint: '#a78bfa', glow: '#ede9ff' },
  parasail: { tint: '#21b8a3', glow: '#dff8f4' },
  poe: { tint: '#8b5cf6', glow: '#f0e9ff' },
  stepfun: { tint: '#35b17f', glow: '#e3f7ee' },
  writer: { tint: '#2563eb', glow: '#dbeafe' },
};

const providerIconMap = {
  anthropic: 'Claude.png',
  cerebras: 'Cerebras.png',
  cohere: 'Cohere.png',
  deepseek: 'Deepseek.png',
  fireworks: 'Fireworks.png',
  google: 'Gemini.png',
  githubmodels: 'GitHub.png',
  groq: 'Groq.png',
  hyperbolic: 'Hyperbolic.png',
  lambda: 'Lambda.png',
  lmstudio: 'LmStudio.png',
  minimax: 'MiniMax.png',
  mistral: 'Mistral.png',
  nvidia: 'Nvidia.png',
  novita: 'Novita.png',
  ollama: 'Ollama.png',
  openai: 'ChatGPT.png',
  openrouter: 'OpenRouter.png',
  perplexity: 'Perplexity.png',
  requesty: 'Requesty.png',
  sambanova: 'SambaNova.png',
  ai21: 'AI21.png',
  together: 'Together.png',
  vercelaigateway: 'Vercel.png',
  xai: 'xAI.png',
  zai: 'Zai.png',
  huggingface: 'HuggingFace.png',
  moonshot: 'MoonShot.png',
  siliconflow: 'SiliconFlow.png',
  alibaba: 'Alibaba.png',
  mulerouter: 'MuleRouter.png',
  writer: 'Writer.png',
  poe: 'Poe.png',
  parasail: 'Parasail.png',
  stepfun: 'StepFun.png',
};

function summarizeModels(models) {
  const modelList = Object.entries(models ?? {}).map(([id, model]) => ({
    id,
    ...model,
  }));
  const featuredModels = modelList.slice(0, 3).map((model) => model.name);
  const summary = modelList[0]?.description ?? '';

  return {
    models: modelList,
    modelCount: modelList.length,
    featuredModels,
    summary,
  };
}

function buildProviderRecord(providerConfiguration, rootDirectory) {
  const { models, modelCount, featuredModels, summary } = summarizeModels(
    providerConfiguration.models,
  );
  const providerId = providerConfiguration.provider;
  const palette = providerPalette[providerId] ?? { tint: '#d0b4a2', glow: '#f7ede7' };
  const isLocal = providerConfiguration.requires_api_key === false;
  const iconFileName = providerIconMap[providerId];

  return {
    id: providerId,
    label: providerConfiguration.label,
    endpoint: providerConfiguration.endpoint,
    authHeader: providerConfiguration.auth_header ?? null,
    authPrefix: providerConfiguration.auth_prefix ?? '',
    requiresApiKey: !isLocal,
    type: isLocal ? 'local' : 'cloud',
    modelCount,
    models,
    featuredModels,
    summary,
    iconPath: iconFileName
      ? pathToFileURL(path.join(rootDirectory, 'Assets', 'Icons', iconFileName)).href
      : '',
    palette,
    requirements: isLocal
      ? [
          {
            key: 'endpoint',
            kind: 'url',
            defaultValue: providerConfiguration.endpoint,
          },
        ]
      : [
          {
            key: 'apiKey',
            kind: 'secret',
            defaultValue: '',
          },
        ],
  };
}

let cachedCatalog = null;
let catalogInflight = null;

export async function readProviderCatalog(rootDirectory) {
  if (cachedCatalog) return cachedCatalog;

  if (catalogInflight) return catalogInflight;

  catalogInflight = (async () => {
    const modelsDirectory = path.join(rootDirectory, 'Config', 'Models');
    const indexPath = path.join(modelsDirectory, 'index.json');
    const indexContents = await readFile(indexPath, 'utf8');
    const providerFiles = JSON.parse(indexContents);

    const providers = await Promise.all(
      providerFiles.map(async (fileName) => {
        const providerName = path.basename(fileName, '.json');
        const providerPath = path.join(modelsDirectory, providerName, fileName);
        const providerContents = await readFile(providerPath, 'utf8');
        const providerConfiguration = JSON.parse(providerContents);
        return buildProviderRecord(providerConfiguration, rootDirectory);
      }),
    );

    cachedCatalog = providers;
    catalogInflight = null;
    return providers;
  })();

  return catalogInflight;
}

export function invalidateProviderCatalogCache() {
  cachedCatalog = null;
  catalogInflight = null;
}
