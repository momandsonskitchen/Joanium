export const CHAT_PROMPTS = Object.freeze({
  fallbackSystem: 'You are running inside Joanium, a local-first AI desktop assistant.',
  latestUserMessageAnchor:
    'You are in a multi-turn conversation. Respond only to the most recent user message.',
  attachmentOnly: 'Please use the attached file context.',
  continueWithoutReasoning:
    'Continue the previous assistant response. The prior turn produced reasoning but no final ' +
    'answer. Give the final answer now without repeating the reasoning.',
  toolFailureRetry:
    'The tool failed. Diagnose the error, then retry with a corrected approach or use an ' +
    'alternative method to accomplish the same goal.',
  terminalToolsCompleted:
    "All tool calls completed successfully. If this fully satisfies the user's request, respond " +
    'with a brief confirmation of what was accomplished. Do NOT call the same tools again.',
  toolsetToolsCompleted:
    "All tool calls completed successfully. If this fully satisfies the user's request, respond " +
    'with a brief confirmation of what was accomplished. Do NOT call the same tools again with ' +
    'the same arguments.',
  toolCallsFailedRetry:
    'One or more tool calls failed. Diagnose the errors, then retry with corrected approaches. ' +
    'Do not repeat exact same failing calls.',
  nestedSubAgentsUnavailable: 'Nested sub-agents are not available inside a sub-agent task.',
  subAgentFallbackGoal:
    'Help the coordinator finish the user request by combining focused delegated handoffs.',
});

export const ATTACHMENT_CONTEXT_PROMPTS = Object.freeze({
  header: 'Attached file context',
  item: 'Attachment {index}: {name}',
  summary: 'Summary: {summary}',
  truncated: 'This extracted text was truncated to fit chat context.',
  unknownAttachment: 'Attachment',
});

export const LIVE_BROWSER_CONTEXT_PROMPTS = Object.freeze({
  header: '# Live browser context',
  open: 'A live browser tab is currently open.',
  title: 'Title: {title}',
  url: 'URL: {url}',
  visible: 'Visible: {visible}',
  loading: 'Loading: {loading}',
  status: 'Status: {status}',
  yes: 'yes',
  no: 'no',
  untitled: 'Untitled page',
  ready: 'Ready',
  instruction:
    'If the latest user message refers to this tab, page, article, site, or asks to summarize ' +
    'or explain it, use browser_get_text or browser_snapshot directly on the current page before ' +
    'answering.',
  navigationInstruction:
    'Do not say you cannot see the opened tab. Do not call browser_navigate first unless you ' +
    'need to change to a different URL.',
});
