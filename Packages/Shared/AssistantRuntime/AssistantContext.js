import {
  loadMemoryContext,
  loadTerminalPrompt,
  loadToolsetPrompt,
  loadSkillsContext,
} from '../ToolLoop/RendererToolLoop.js';

export function createAssistantContextCache() {
  return {
    terminalPrompt: null,
    toolsetPrompt: null,
    skillsContext: null,
  };
}

export function resetAssistantContextCache(cache) {
  if (!cache) return;
  cache.terminalPrompt = null;
  cache.toolsetPrompt = null;
  cache.skillsContext = null;
}

export function joinPromptParts(parts = []) {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join('\n\n');
}

export async function loadAssistantRuntimeContext(
  cache = createAssistantContextCache(),
  {
    includeMemory = true,
    includeTerminalPrompt = true,
    includeToolsetPrompt = true,
    includeSkillsContext = true,
  } = {},
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
  const skillsPromise =
    includeSkillsContext && cache.skillsContext === null
      ? loadSkillsContext()
      : Promise.resolve(cache.skillsContext ?? '');

  const [memoryContext, terminalPrompt, toolsetPrompt, skillsContext] = await Promise.all([
    memoryPromise,
    terminalPromise,
    toolsetPromise,
    skillsPromise,
  ]);

  if (includeTerminalPrompt) {
    cache.terminalPrompt = terminalPrompt ?? '';
  }

  if (includeToolsetPrompt) {
    cache.toolsetPrompt = toolsetPrompt ?? '';
  }

  if (includeSkillsContext) {
    cache.skillsContext = skillsContext ?? '';
  }

  return {
    memoryContext: memoryContext ?? '',
    terminalPrompt: terminalPrompt ?? '',
    toolsetPrompt: toolsetPrompt ?? '',
    skillsContext: skillsContext ?? '',
  };
}
