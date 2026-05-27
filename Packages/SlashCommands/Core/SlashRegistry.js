import COMMANDS from './Commands.js';
import { readBundledPromptFile } from '../../Shared/Utils/PromptUtils.js';

export function createSlashRegistry(rootDirectory) {
  const modePromptFiles = new Map(
    COMMANDS.filter((command) => command.type === 'mode').map((command) => [
      command.id,
      `Modes/${command.id}.md`,
    ]),
  );

  return {
    /**
     * Returns all built-in slash command definitions.
     * Templates and agents are discovered separately by the Chat package.
     *
     * @returns {Array<object>}
     */
    listCommands() {
      return COMMANDS;
    },

    /**
     * Returns the system-prompt instruction string for a given mode id,
     * or null if the mode is unknown.
     *
     * @param {string} modeId
     * @returns {Promise<string|null>}
     */
    async getModeInstruction(modeId) {
      if (!modeId) return null;
      const promptFile = modePromptFiles.get(modeId);
      if (!promptFile) return null;
      return readBundledPromptFile(rootDirectory, promptFile).catch(() => null);
    },
  };
}
