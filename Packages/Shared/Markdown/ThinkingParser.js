/**
 * Shared/Markdown/ThinkingParser.js
 *
 * Extracts inline thinking tags that various models embed in their response text.
 *
 * Supported tags:
 *   <think>, <thinking>, <reasoning>, <thought>, <thoughts>,
 *   <scratchpad>, <analysis>, <chain_of_thought>
 *
 * Usage:
 *   import { parseThinkingFromText } from '../../Shared/Markdown/ThinkingParser.js';
 *   const { content, thinking } = parseThinkingFromText(rawText);
 *   // content  — visible text with all thinking tags removed
 *   // thinking — concatenated inner text of all thinking tags
 */

const THINKING_TAG_PAIRS = [
  ['<thinking>', '</thinking>'],
  ['<think>', '</think>'],
  ['<reasoning>', '</reasoning>'],
  ['<thought>', '</thought>'],
  ['<thoughts>', '</thoughts>'],
  ['<scratchpad>', '</scratchpad>'],
  ['<analysis>', '</analysis>'],
  ['<chain_of_thought>', '</chain_of_thought>'],
];

/**
 * Parses a raw model response string and separates visible content from
 * any inline thinking/reasoning blocks the model may have embedded.
 *
 * Handles unclosed tags gracefully (e.g. mid-stream responses) by treating
 * the remainder of the string as thinking content.
 *
 * @param {string} text  Raw model output.
 * @returns {{ content: string, thinking: string }}
 */
export function parseThinkingFromText(text) {
  if (!text) return { content: '', thinking: '' };

  let thinking = '';
  let content = text;

  for (const [open, close] of THINKING_TAG_PAIRS) {
    let result = '';
    let remaining = content;

    while (remaining.length > 0) {
      const start = remaining.indexOf(open);
      if (start === -1) {
        result += remaining;
        break;
      }

      result += remaining.slice(0, start);
      const end = remaining.indexOf(close, start + open.length);

      if (end === -1) {
        // Unclosed tag — treat the rest as thinking (still streaming).
        thinking += remaining.slice(start + open.length);
        break;
      }

      thinking += remaining.slice(start + open.length, end);
      remaining = remaining.slice(end + close.length);
    }

    content = result;
  }

  return { content: content.trimStart(), thinking: thinking.trim() };
}
