import { formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { formatBytes } from '../../Shared/Utils/ValueUtils.js';
import { ATTACHMENT_CONTEXT_PROMPTS, LIVE_BROWSER_CONTEXT_PROMPTS } from '../Prompts/Prompts.js';

export { formatBytes };

export function getFirstName(name, fallback) {
  const normalized = collapseWhitespace(name);
  if (!normalized) return fallback;
  return normalized.split(' ')[0];
}

export function stripMarkdown(text) {
  return String(text ?? '')
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^~~~[\s\S]*?^~~~/gm, '')
    .replace(/`[^`\n]+`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*{3}|_{3})(.*?)\1/g, '$2')
    .replace(/(\*{2}|_{2})(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+[.)]\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/[<>]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strips any XML-style native tool call markup that models may emit alongside
 * the joanium-tool code block. Different models have different tag names
 * (e.g. <tool_call>, <function_call>, <invoke>, vendor-namespaced variants like
 * <vendor:toolcall>, etc.) so we match the shape rather than specific names.
 *
 * Each replacement category runs in its own stability loop (repeated until the
 * string stops changing). This satisfies CodeQL js/incomplete-multi-character-sanitization
 * by ensuring each multi-character pattern is individually applied to a fixed point,
 * preventing crafted inputs from reassembling dangerous tags across loop iterations.
 */
export function stripNativeToolCalls(text) {
  if (!text) return text;
  // Fast path: no angle brackets means no XML tool-call tags to strip.
  if (!text.includes('<')) return text.trim();

  let current = text;
  let previous;

  // Pass 1: Namespaced XML tags — <vendor:anything>...</vendor:anything>
  do {
    previous = current;
    current = current.replace(
      /<[a-z][a-z0-9]*:[a-z][a-z0-9_-]*[\s\S]*?<\/[a-z][a-z0-9]*:[a-z][a-z0-9_-]*>/gi,
      '',
    );
  } while (current !== previous);

  // Pass 2: Unnamespaced tool-call wrapper elements (complete pairs)
  do {
    previous = current;
    current = current.replace(
      /<(?:tool_call|tool_use|function_call|invoke|tool_calls)[^>]*>[\s\S]*?<\/(?:tool_call|tool_use|function_call|invoke|tool_calls)>/gi,
      '',
    );
  } while (current !== previous);

  // Pass 3: Orphaned opening tags (mid-stream cutoff)
  do {
    previous = current;
    current = current.replace(
      /<(?:tool_call|tool_use|function_call|invoke|tool_calls)[^>]*>/gi,
      '',
    );
  } while (current !== previous);

  // Pass 4: Orphaned closing tags
  do {
    previous = current;
    current = current.replace(/<\/(?:tool_call|tool_use|function_call|invoke|tool_calls)>/gi, '');
  } while (current !== previous);

  return current.trim();
}

/**
 * Strips joanium-tool and joanium-terminal fenced blocks from visible content.
 * Used when generation is stopped mid-stream so raw JSON doesn't render as markdown.
 */
export function stripToolCallBlocks(text) {
  if (!text) return text;
  // Fast path: no fenced joanium blocks to strip.
  if (!text.includes('joanium-')) return text;
  return text.replace(/```joanium-(?:tool|terminal)[\s\S]*?(?:```|$)/gi, '').trim();
}

export function stripEmptyCodeFences(text) {
  if (!text) return text;
  return String(text)
    .replace(/```[^\r\n`]*\r?\n[ \t\r\n]*```/g, '')
    .replace(/```[A-Za-z0-9_-]*[ \t]*```/g, '')
    .trim();
}

export function sanitizeAssistantVisibleContent(text) {
  return stripEmptyCodeFences(stripNativeToolCalls(stripToolCallBlocks(text)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function generateSessionId() {
  const date = new Date();
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`;
}

export function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function getFileExtension(fileName = '') {
  const ext = String(fileName).split('.').pop()?.trim().toUpperCase();
  return ext && ext !== fileName.toUpperCase() ? ext.slice(0, 4) : 'FILE';
}

export function toAttachmentSummary(attachment) {
  return {
    id: attachment.id,
    name: attachment.name ?? '',
    summary: attachment.summary ?? '',
    kind: attachment.kind ?? '',
    size: attachment.size ?? 0,
    lines: attachment.lines ?? 0,
    truncated: Boolean(attachment.truncated),
  };
}

export function buildAttachmentContext(strings, attachments) {
  // Images are sent as multimodal content blocks - exclude them from text context.
  const textAttachments = attachments.filter((a) => a.kind !== 'image' && a.text);
  if (!textAttachments.length) return '';

  const blocks = textAttachments.map((attachment, index) => {
    const header = formatText(ATTACHMENT_CONTEXT_PROMPTS.item, {
      index: String(index + 1),
      name: attachment.name ?? ATTACHMENT_CONTEXT_PROMPTS.unknownAttachment,
    });
    const summary = attachment.summary
      ? formatText(ATTACHMENT_CONTEXT_PROMPTS.summary, { summary: attachment.summary })
      : '';
    const truncated = attachment.truncated ? ATTACHMENT_CONTEXT_PROMPTS.truncated : '';

    return [header, summary, truncated, attachment.text ?? ''].filter(Boolean).join('\n');
  });

  return `${ATTACHMENT_CONTEXT_PROMPTS.header}\n\n${blocks.join('\n\n')}`;
}

export function buildModelContent(strings, prompt, attachments) {
  const attachmentContext = buildAttachmentContext(strings, attachments);
  return [prompt, attachmentContext].filter(Boolean).join('\n\n');
}

export function buildLiveBrowserContext(strings, state = {}) {
  if (!state?.hasPage || !state.url) return '';

  const browserContext = LIVE_BROWSER_CONTEXT_PROMPTS;

  const formatFlag = (value) => (value ? browserContext.yes : browserContext.no);
  const lines = [
    browserContext.header,
    browserContext.open,
    formatText(browserContext.title, { title: state.title || browserContext.untitled }),
    formatText(browserContext.url, { url: state.url }),
    formatText(browserContext.visible, { visible: formatFlag(state.visible) }),
    formatText(browserContext.loading, { loading: formatFlag(state.loading) }),
    formatText(browserContext.status, { status: state.status || browserContext.ready }),
    '',
    browserContext.instruction,
    browserContext.navigationInstruction,
  ];

  return lines
    .filter((line) => line !== undefined && line !== null)
    .join('\n')
    .trim();
}

export async function loadLiveBrowserContext(strings) {
  try {
    const state = await invokeIpc('browser-preview:get-state');
    return buildLiveBrowserContext(strings, state);
  } catch {
    return '';
  }
}

export function formatPromptTemplate(template, replacements = {}) {
  const activeLines = String(template ?? '')
    .split(/\r?\n/)
    .filter((line) =>
      Object.entries(replacements).every(([key, value]) => value || !line.includes(`{${key}}`)),
    )
    .join('\n');

  return formatText(activeLines, replacements).trim();
}

function parseToolObject(value) {
  if (!value || typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mergeToolArgument(target, value) {
  if (value === undefined || value === null) return;

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    Object.assign(target, value);
    return;
  }

  if (target.tasks === undefined) {
    target.tasks = value;
  }
}

export function normalizeSubAgentPayloadParameters(toolPayload = {}) {
  const parameters = parseToolObject(toolPayload.parameters);
  const args = parseToolObject(toolPayload.arguments);
  const { tool: _tool, parameters: _parameters, arguments: _arguments, ...topLevel } = toolPayload;

  const normalized = { ...topLevel };
  mergeToolArgument(normalized, args);
  mergeToolArgument(normalized, parameters);
  return normalized;
}
