import strings from './I18n/en.js';
import {
  formatProductKnowledge,
  formatSkill,
  formatSkillList,
  listSkills,
  readProductKnowledge,
  readSkill,
} from './Utils.js';
import { buildKnowledgePromptSection } from './Prompt.js';
import { readBundledPromptFile } from '../../../Shared/Utils/PromptUtils.js';

export async function createToolPackage({ rootDirectory } = {}) {
  const [skills, knowledgePrompt] = await Promise.all([
    listSkills(rootDirectory, { limit: 50 }).catch(() => []),
    readBundledPromptFile(rootDirectory, 'Knowledge.md'),
  ]);

  return {
    id: 'knowledge',
    toolDefinitions: [
      {
        name: 'read_product_knowledge',
        description:
          'Read Joanium product knowledge from the bundled ProductKnowledge prompt file. Use this for app-specific behavior, architecture, product decisions, or implementation rules.',
        parameters: {},
      },
      {
        name: 'list_skills',
        description:
          'List available Joanium skills with their triggers and descriptions. Use this before choosing which skill to read.',
        parameters: {
          query: {
            type: 'string',
            required: false,
            description: 'Optional search text for skill name, namespace, trigger, or description.',
          },
          limit: {
            type: 'number',
            required: false,
            description: 'Maximum number of skills to return.',
          },
        },
      },
      {
        name: 'read_skill',
        description:
          'Read the full Markdown instructions for a Joanium skill. Use this before doing work that matches a skill trigger or description.',
        parameters: {
          id: {
            type: 'string',
            required: false,
            description: 'Skill id in the form namespace/filename.md.',
          },
          namespace: {
            type: 'string',
            required: false,
            description: 'Skill namespace, for example Joanium.',
          },
          filename: {
            type: 'string',
            required: false,
            description: 'Skill Markdown filename, for example FrontendDesign.md.',
          },
        },
      },
    ],
    toolHandlers: {
      async read_product_knowledge() {
        const content = await readProductKnowledge(rootDirectory);
        return formatProductKnowledge(content, strings);
      },
      async list_skills(params = {}) {
        const skills = await listSkills(rootDirectory, params);
        return formatSkillList(skills, strings);
      },
      async read_skill(params = {}) {
        return formatSkill(await readSkill(rootDirectory, params), strings);
      },
    },
    promptSections: [buildKnowledgePromptSection(skills, knowledgePrompt)],
  };
}

export default createToolPackage;
