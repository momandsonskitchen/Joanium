import {
  createAssistantContextCache,
  joinPromptParts,
  loadAssistantRuntimeContext,
  resetAssistantContextCache,
} from './AssistantContext.js';
import {
  runRendererToolLoop,
  stripThinking,
  TERMINAL_TOOL_NAMES,
} from '../ToolLoop/RendererToolLoop.js';
import { applyOptionalRequestValue, hasExplicitValue, resolveRuntimeValue } from './Utils.js';

export {
  createAssistantContextCache,
  joinPromptParts,
  resetAssistantContextCache,
  stripThinking,
  TERMINAL_TOOL_NAMES,
};

export const DEFAULT_ASSISTANT_MAX_TOOL_CALLS = 10;
export const DEFAULT_ASSISTANT_TERMINAL_TOOLS = new Set(TERMINAL_TOOL_NAMES);

export async function loadAssistantPipelineRuntime({
  contextCache = createAssistantContextCache(),
  includeMemory = true,
  includeTerminalPrompt = true,
  includeToolsetPrompt = true,
  includeSkillsContext = true,
  memoryContext,
  terminalTools,
  toolsetTools,
  skillsContext,
  terminalToolsFallback = '',
  toolsetToolsFallback = '',
} = {}) {
  const shouldLoadMemory = includeMemory && !hasExplicitValue(memoryContext);
  const shouldLoadTerminalPrompt = includeTerminalPrompt && !hasExplicitValue(terminalTools);
  const shouldLoadToolsetPrompt = includeToolsetPrompt && !hasExplicitValue(toolsetTools);
  const shouldLoadSkillsContext = includeSkillsContext && !hasExplicitValue(skillsContext);

  const runtimeContext = await loadAssistantRuntimeContext(contextCache, {
    includeMemory: shouldLoadMemory,
    includeTerminalPrompt: shouldLoadTerminalPrompt,
    includeToolsetPrompt: shouldLoadToolsetPrompt,
    includeSkillsContext: shouldLoadSkillsContext,
  });

  return {
    memoryContext: resolveRuntimeValue(memoryContext, runtimeContext.memoryContext),
    terminalTools: resolveRuntimeValue(
      terminalTools,
      runtimeContext.terminalPrompt,
      terminalToolsFallback,
    ),
    toolsetTools: resolveRuntimeValue(
      toolsetTools,
      runtimeContext.toolsetPrompt,
      toolsetToolsFallback,
    ),
    skillsContext: resolveRuntimeValue(skillsContext, runtimeContext.skillsContext),
  };
}

export async function createAssistantPipelineRequest({
  messages = [],
  contextCache = createAssistantContextCache(),
  persona = '',
  personaParts = [],
  memoryContext,
  terminalTools,
  toolsetTools,
  skillsContext,
  terminalToolsFallback = '',
  toolsetToolsFallback = '',
  providerId = null,
  modelId = null,
  projectInfo = null,
  modeInstruction = null,
  source = 'chat',
  isNewSession = false,
  includeMemory = true,
  includeTerminalPrompt = true,
  includeToolsetPrompt = true,
  includeSkillsContext = true,
} = {}) {
  const runtimeContext = await loadAssistantPipelineRuntime({
    contextCache,
    includeMemory,
    includeTerminalPrompt,
    includeToolsetPrompt,
    includeSkillsContext,
    memoryContext,
    terminalTools,
    toolsetTools,
    skillsContext,
    terminalToolsFallback,
    toolsetToolsFallback,
  });
  const request = {
    messages,
    isNewSession: Boolean(isNewSession),
    source,
  };

  applyOptionalRequestValue(request, 'persona', joinPromptParts([persona, ...personaParts]));
  applyOptionalRequestValue(request, 'memoryContext', runtimeContext.memoryContext);
  applyOptionalRequestValue(request, 'terminalTools', runtimeContext.terminalTools);
  applyOptionalRequestValue(request, 'toolsetTools', runtimeContext.toolsetTools);
  applyOptionalRequestValue(request, 'skillsContext', runtimeContext.skillsContext);
  applyOptionalRequestValue(request, 'providerId', providerId);
  applyOptionalRequestValue(request, 'modelId', modelId);
  applyOptionalRequestValue(request, 'projectInfo', projectInfo);
  applyOptionalRequestValue(request, 'modeInstruction', modeInstruction);

  return request;
}

export async function runAssistantPipeline({
  completeMessage,
  maxToolCalls = DEFAULT_ASSISTANT_MAX_TOOL_CALLS,
  supportedTerminalTools = DEFAULT_ASSISTANT_TERMINAL_TOOLS,
  executeTerminal,
  executeToolset,
  formatTerminalResult,
  formatToolsetResult,
  onProgress = null,
  toolStepMessage,
  toolLimitMessage,
  fallbackText,
  ...requestOptions
} = {}) {
  const request = await createAssistantPipelineRequest(requestOptions);

  return runRendererToolLoop({
    messages: request.messages,
    persona: request.persona,
    memoryContext: request.memoryContext,
    terminalTools: request.terminalTools,
    toolsetTools: request.toolsetTools,
    providerId: request.providerId,
    modelId: request.modelId,
    projectInfo: request.projectInfo,
    modeInstruction: request.modeInstruction,
    source: request.source,
    isNewSession: request.isNewSession,
    maxToolCalls,
    supportedTerminalTools,
    executeTerminal,
    executeToolset,
    formatTerminalResult,
    formatToolsetResult,
    onProgress,
    toolStepMessage,
    toolLimitMessage,
    fallbackText,
    completeMessage,
  });
}
