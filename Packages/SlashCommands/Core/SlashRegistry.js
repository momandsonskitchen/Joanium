import en from '../I18n/en.js';

const LOCALES = { en };

export function createSlashRegistry({ locale = 'en' } = {}) {
  const strings = LOCALES[locale] ?? LOCALES.en;

  return {
    /**
     * Returns all built-in slash command definitions.
     * Templates and agents are discovered separately by the Chat package.
     *
     * @returns {Array<{ id: string, label: string, description: string, type: string, icon: string }>}
     */
    listCommands() {
      return strings.commands ?? [];
    },

    /**
     * Returns the system-prompt instruction string for a given mode id,
     * or null if the mode is unknown.
     *
     * @param {string} modeId
     * @returns {string|null}
     */
    getModeInstruction(modeId) {
      if (!modeId) return null;
      return strings.modes?.[modeId] ?? null;
    }
  };
}
