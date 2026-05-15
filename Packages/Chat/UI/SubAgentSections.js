import { createElement } from '../../Shared/Utils/DomUtils.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
import { parseThinkingFromText } from '../../Shared/Markdown/ThinkingParser.js';
import { createThinkingBlock, updateThinkingBlockText } from './ThinkingBlock.js';

export function createSubAgentPromptSection(agent, strings) {
  const promptSection = createElement('div', 'chat-subagent-call__agent-section');
  const promptTitle = createElement(
    'h4',
    'chat-subagent-call__agent-section-title',
    strings.tools.subAgentPromptSection,
  );
  const promptEl = renderMarkdown(agent.prompt, 'chat-subagent-call__agent-prompt');
  promptSection.append(promptTitle, promptEl);
  return promptSection;
}

function renderSubAgentOutput(outputSection, agent, strings) {
  const rawOutput = agent.output || agent.error || '';
  const { content: parsedOutput, thinking: outputThinking } = parseThinkingFromText(rawOutput);
  const isError = Boolean(agent.error && !agent.output);

  const sectionTitle = outputSection.querySelector('.chat-subagent-call__agent-section-title');
  if (sectionTitle) {
    sectionTitle.textContent = isError
      ? strings.tools.subAgentErrorSection
      : strings.tools.subAgentOutputSection;
  }

  let thinkingWrap = outputSection.querySelector('.chat-message__thinking');
  if (outputThinking) {
    if (!thinkingWrap) {
      thinkingWrap = createThinkingBlock(strings, outputThinking, { hidden: false });
      if (sectionTitle) sectionTitle.after(thinkingWrap);
      else outputSection.prepend(thinkingWrap);
    } else {
      updateThinkingBlockText(thinkingWrap, outputThinking);
    }
  }

  const fresh = renderMarkdown(
    (parsedOutput || rawOutput).trimStart(),
    'chat-subagent-call__agent-output',
  );
  const existing = outputSection.querySelector('.chat-subagent-call__agent-output');
  if (existing) existing.replaceWith(fresh);
  else outputSection.append(fresh);
}

export function createSubAgentOutputSection(agent, strings) {
  const outputSection = createElement(
    'div',
    'chat-subagent-call__agent-section chat-subagent-call__agent-output-section',
  );
  outputSection.append(createElement('h4', 'chat-subagent-call__agent-section-title', ''));
  renderSubAgentOutput(outputSection, agent, strings);
  return outputSection;
}

export function upsertSubAgentOutputSection(body, agent, strings) {
  if (!agent.output && !agent.error) return;

  let outputSection = body.querySelector('.chat-subagent-call__agent-output-section');
  if (!outputSection) {
    outputSection = createSubAgentOutputSection(agent, strings);
    body.append(outputSection);
    return;
  }

  renderSubAgentOutput(outputSection, agent, strings);
}
