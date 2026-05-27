export const TOOL_LOOP_PROMPTS = Object.freeze({
  toolStepMessage: 'Let me check that.',
  toolLimitMessage: 'I could not finish the requested tool workflow.',
  fallbackText: 'I could not finish the requested workflow.',
});

export const SKILLS_CONTEXT_PROMPT_TEMPLATE = [
  '# Skills',
  "You have curated skill documents available. When the user's request would clearly benefit " +
    'from a specific skill, load it by emitting exactly this block (do not load speculatively):',
  '```joanium-tool',
  '{"tool":"read_skill","namespace":"<namespace>","filename":"<filename>"}',
  '```',
  'Load at most one skill per turn. The skill content will be injected as a tool result so you ' +
    'can use it in your next reply.',
  '',
  'Available skills:',
  '{{SKILL_CATALOG}}',
].join('\n');
