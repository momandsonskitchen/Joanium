import { formatTokenCount, resolveContextWindow } from '../Utils/ModelInfoUtils.js';

const ESTIMATED_CHARS_PER_TOKEN = 4;
const DEFAULT_CONTEXT_WINDOW = 128000;
const DEFAULT_MAX_OUTPUT = 16000;

function normalizeText(value) {
  if (value == null || value === false) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).join('\n');
  }

  if (typeof value === 'object') {
    if (typeof value.text === 'string') {
      return value.text;
    }

    if (typeof value.content === 'string') {
      return value.content;
    }

    return '';
  }

  return String(value);
}

function estimateTokens(value) {
  const text = normalizeText(value).trim();
  if (!text) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN));
}

function estimateConversationTokens(conversation) {
  if (!Array.isArray(conversation)) {
    return 0;
  }

  return conversation.reduce(
    (total, message) => total + estimateTokens(message?.modelContent ?? message?.content),
    0,
  );
}

function resolveAvailableInput(model) {
  const contextWindow = resolveContextWindow(model) ?? DEFAULT_CONTEXT_WINDOW;
  const maxOutput = model?.max_output ?? model?.maxOutput ?? DEFAULT_MAX_OUTPUT;
  return Math.max(1, contextWindow - maxOutput);
}

function resolveStatus(percent) {
  if (percent >= 90) {
    return 'critical';
  }

  if (percent >= 75) {
    return 'warning';
  }

  if (percent >= 50) {
    return 'moderate';
  }

  return 'healthy';
}

function formatCompactTokenCount(value) {
  return (formatTokenCount(value) ?? '0').toLowerCase();
}

export function createContextMetrics(input = {}) {
  const availableForInput = resolveAvailableInput(input.model);
  const totalUsed =
    estimateTokens(input.systemPrompt) +
    estimateTokens(input.memoryContext) +
    estimateTokens(input.toolsPrompt) +
    estimateTokens(input.skillsContext) +
    estimateTokens(input.projectContext) +
    estimateConversationTokens(input.conversation);
  const percent = Math.min(100, (totalUsed / availableForInput) * 100);

  return {
    percent,
    status: resolveStatus(percent),
    usageLabel: `${formatCompactTokenCount(totalUsed)}/${formatCompactTokenCount(
      availableForInput,
    )} used`,
  };
}
