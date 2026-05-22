import {
  loadMemoryContext,
  loadTerminalPrompt,
  loadToolsetPrompt,
} from '../ToolLoop/RendererToolLoop.js';

export function createAssistantContextCache() {
  return {
    terminalPrompt: null,
    toolsetPrompt: null,
  };
}

export function resetAssistantContextCache(cache) {
  if (!cache) return;
  cache.terminalPrompt = null;
  cache.toolsetPrompt = null;
}

export function joinPromptParts(parts = []) {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join('\n\n');
}

export async function loadAssistantRuntimeContext(
  cache = createAssistantContextCache(),
  { includeMemory = true, includeTerminalPrompt = true, includeToolsetPrompt = true } = {},
) {
  const memoryPromise = includeMemory ? loadMemoryContext() : Promise.resolve('');
  const terminalPromise =
    includeTerminalPrompt && cache.terminalPrompt === null
      ? loadTerminalPrompt()
      : Promise.resolve(cache.terminalPrompt ?? '');
  const toolsetPromise =
    includeToolsetPrompt && cache.toolsetPrompt === null
      ? loadToolsetPrompt()
      : Promise.resolve(cache.toolsetPrompt ?? '');

  const [memoryContext, terminalPrompt, toolsetPrompt] = await Promise.all([
    memoryPromise,
    terminalPromise,
    toolsetPromise,
  ]);

  if (includeTerminalPrompt) {
    cache.terminalPrompt = terminalPrompt ?? '';
  }

  if (includeToolsetPrompt) {
    cache.toolsetPrompt = toolsetPrompt ?? '';
  }

  return {
    memoryContext: memoryContext ?? '',
    terminalPrompt: terminalPrompt ?? '',
    toolsetPrompt: toolsetPrompt ?? '',
  };
}
