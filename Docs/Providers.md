# Providers

AI provider management — configuration, model catalogs, and runtime selection.

---

## Architecture

```text
Providers Package
├── Index.js              (51 lines — IPC handlers)
├── Core/
│   └── ProviderState.js  (state management, background sync)
└── I18n/
    └── en.js             (provider strings)
```

---

## Supported Providers

Joanium supports 35 AI providers:

### API-Based Providers

| Provider | Type |
|---|---|
| OpenAI | API |
| Anthropic | API |
| Google (Gemini) | API |
| xAI (Grok) | API |
| Mistral | API |
| Cohere | API |
| DeepSeek | API |
| Groq | API |
| Fireworks | API |
| Together | API |
| Perplexity | API |
| AI21 | API |
| Alibaba | API |
| MiniMax | API |
| Moonshot | API |
| Writer | API |
| StepFun | API |
| ZAI | API |

### Aggregators

| Provider | Type |
|---|---|
| OpenRouter | Aggregator |
| Requesty | Aggregator |

### Local Providers

| Provider | Type |
|---|---|
| Ollama | Local |
| LM Studio | Local |

### Specialized

| Provider | Type |
|---|---|
| Cerebras | Inference |
| HuggingFace | Inference |
| Hyperbolic | Inference |
| Lambda | Inference |
| Novita | Inference |
| Nvidia | Inference |
| Parasail | Inference |
| SambaNova | Inference |
| SiliconFlow | Inference |

### Gateways

| Provider | Type |
|---|---|
| GitHub Models | Gateway |
| Vercel AI Gateway | Gateway |
| MuleRouter | Gateway |
| Poe | Gateway |

---

## Provider Catalog

`Config/Models/index.json` contains provider metadata with:

- Provider name and ID
- API endpoint
- Model list
- Tint/glow color palette (for UI)
- Capability flags

Each provider has its own directory under `Config/Models/<ProviderName>/`.

---

## Provider State

`ProviderState.js` manages:

- Provider configuration (API keys, endpoints, selected model)
- Background model-list sync (24-hour TTL per provider)
- State persistence

### State Shape

```js
{
  providers: {
    'openai': {
      apiKey: 'sk-...',
      endpoint: 'https://api.openai.com/v1',
      selectedModel: 'gpt-4o'
    },
    'anthropic': {
      apiKey: 'sk-ant-...',
      selectedModel: 'claude-sonnet-4-20250514'
    },
    // ...
  }
}
```

---

## IPC Handlers

| Channel | Purpose |
|---|---|
| `providers:list-catalog` | Full provider catalog with model lists |
| `providers:list-configured` | Only configured providers |
| `providers:save` | Save provider config + trigger model sync |
| `providers:remove` | Remove provider config |

---

## Model Sync

When a provider is saved, `ModelSync.js` triggers a background sync to fetch the latest model list from the provider's API. This sync runs with a 24-hour TTL per provider.

---

## Provider Selection in Chat

`ChatState.js` uses the active provider and model selection to:

1. Determine the API endpoint
2. Set authentication headers
3. Format the request for the provider's API
4. Handle provider-specific response formats

### Provider-Specific Handling

- **OpenAI-compatible**: Standard chat completions API
- **Anthropic**: Native API with different request/response format
- **Google**: Native Gemini API with different request/response format

---

## Provider UI

The providers settings panel lets users:

1. Browse the full provider catalog
2. Configure API keys and endpoints
3. Select active models
4. View model lists with capabilities

---

## Provider Utils

`ProviderUtils.js` provides:

- `orderProvidersBySelection()` — Sorts providers by selection state
- `providerIsConfigured()` — Checks if a provider has valid credentials

---

## Provider Catalog UI

`ProviderCatalog.js` reads provider metadata and provides:

- Tint/glow color palette for 35+ providers
- Provider card rendering
- Model selection UI
