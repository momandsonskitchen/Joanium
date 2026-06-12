import { formatPromptTemplate } from '../../../Shared/Utils/PromptUtils.js';
import { formatText } from '../../../Shared/Utils/DomUtils.js';

const KNOWLEDGE_PROMPTS = Object.freeze({
  noSkills: 'No skills are currently installed.',
  skillLine: '- {id} ({name}): {description}{trigger}',
});

export function buildKnowledgePromptSection(skills = [], promptTemplate = '') {
  const skillLines = skills.length
    ? skills.map((skill) =>
        formatText(KNOWLEDGE_PROMPTS.skillLine, {
          id: skill.id,
          name: skill.name,
          description: skill.description || 'No description.',
          trigger: skill.trigger ? ` Trigger: ${skill.trigger}.` : '',
        }),
      )
    : [KNOWLEDGE_PROMPTS.noSkills];

  return formatPromptTemplate(promptTemplate, {
    SKILL_LINES: skillLines.join('\n'),
  });
}
