import { formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';

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
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strips any XML-style native tool call markup that models may emit alongside
 * the joanium-tool code block. Different models have different tag names
 * (e.g. <tool_call>, <function_call>, <invoke>, vendor-namespaced variants like
 * <vendor:toolcall>, etc.) so we match the shape rather than specific names.
 */
export function stripNativeToolCalls(text) {
  if (!text) return text;
  // Fast path: no angle brackets means no XML tool-call tags to strip.
  if (!text.includes('<')) return text.trim();
  return (
    text
      // Namespaced XML tags: <vendor:anything>...</vendor:anything>
      .replace(/<[a-z][a-z0-9]*:[a-z][a-z0-9_-]*[\s\S]*?<\/[a-z][a-z0-9]*:[a-z][a-z0-9_-]*>/gi, '')
      // Common unnamespaced tool-call wrapper elements (complete pairs only)
      .replace(
        /<(?:tool_call|tool_use|function_call|invoke|tool_calls)[^>]*>[\s\S]*?<\/(?:tool_call|tool_use|function_call|invoke|tool_calls)>/gi,
        '',
      )
      // Orphaned opening tags of the same set (mid-stream cutoff)
      .replace(/<(?:tool_call|tool_use|function_call|invoke|tool_calls)[^>]*>/gi, '')
      // Orphaned closing tags
      .replace(/<\/(?:tool_call|tool_use|function_call|invoke|tool_calls)>/gi, '')
      .trim()
  );
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

export function sanitizeAssistantVisibleContent(text) {
  return stripNativeToolCalls(stripToolCallBlocks(text))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function generateSessionId() {
  const date = new Date();
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`;
}

export function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  // Images are sent as multimodal content blocks — exclude them from text context.
  const textAttachments = attachments.filter((a) => a.kind !== 'image' && a.text);
  if (!textAttachments.length) return '';

  const blocks = textAttachments.map((attachment, index) => {
    const header = formatText(strings.composer.attachmentContextItem, {
      index: String(index + 1),
      name: attachment.name ?? strings.composer.unknownAttachment,
    });
    const summary = attachment.summary
      ? formatText(strings.composer.attachmentContextSummary, { summary: attachment.summary })
      : '';
    const truncated = attachment.truncated ? strings.composer.attachmentContextTruncated : '';

    return [header, summary, truncated, attachment.text ?? ''].filter(Boolean).join('\n');
  });

  return `${strings.composer.attachmentContextHeader}\n\n${blocks.join('\n\n')}`;
}

export function buildModelContent(strings, prompt, attachments) {
  const attachmentContext = buildAttachmentContext(strings, attachments);
  return [prompt, attachmentContext].filter(Boolean).join('\n\n');
}
