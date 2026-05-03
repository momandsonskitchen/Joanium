import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readProviderCatalog } from '../../Shared/ProviderCatalog/ProviderCatalog.js';
import { readUserState } from '../../Shared/UserData/UserData.js';

function collapseWhitespace(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function sanitizeRecentPrompt(candidate) {
  const prompt = collapseWhitespace(candidate?.prompt);

  if (!prompt) {
    return null;
  }

  const title = collapseWhitespace(candidate?.title) || truncate(prompt, 42);
  const summary = collapseWhitespace(candidate?.summary) || truncate(prompt, 88);
  const updatedAt = typeof candidate?.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString();

  return {
    title: truncate(title, 48),
    summary: truncate(summary, 112),
    prompt,
    updatedAt
  };
}

function sanitizeHomeState(candidateState) {
  if (!candidateState || typeof candidateState !== 'object') {
    return { recentPrompts: [] };
  }

  const recentPrompts = Array.isArray(candidateState.recentPrompts)
    ? candidateState.recentPrompts.map(sanitizeRecentPrompt).filter(Boolean).slice(0, 6)
    : [];

  return { recentPrompts };
}

export function createChatStateManager({ rootDirectory }) {
  const homeFilePath = path.join(rootDirectory, 'Data', 'Chat', 'Home.json');

  async function readHomeState() {
    try {
      const fileContents = await readFile(homeFilePath, 'utf8');

      if (!fileContents.trim()) {
        return { recentPrompts: [] };
      }

      return sanitizeHomeState(JSON.parse(fileContents));
    } catch {
      return { recentPrompts: [] };
    }
  }

  async function writeHomeState(nextState) {
    await mkdir(path.dirname(homeFilePath), { recursive: true });
    await writeFile(homeFilePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
    return nextState;
  }

  return {
    async getBootstrapPayload() {
      const [user, providers, home] = await Promise.all([
        readUserState(rootDirectory),
        readProviderCatalog(rootDirectory),
        readHomeState()
      ]);

      return {
        user,
        providers,
        home
      };
    },
    async saveRecentPrompt(promptEntry) {
      const nextEntry = sanitizeRecentPrompt(promptEntry);
      const currentState = await readHomeState();

      if (!nextEntry) {
        return currentState;
      }

      const dedupedPrompts = currentState.recentPrompts.filter((item) => {
        return item.prompt !== nextEntry.prompt && item.title.toLowerCase() !== nextEntry.title.toLowerCase();
      });

      const nextState = {
        recentPrompts: [nextEntry, ...dedupedPrompts].slice(0, 6)
      };

      return writeHomeState(nextState);
    }
  };
}
