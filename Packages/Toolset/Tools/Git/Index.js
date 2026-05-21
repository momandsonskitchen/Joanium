import { createGitService } from './Core/GitService.js';

export function createToolPackage() {
  const gitService = createGitService();

  return {
    id: 'git',
    ipcHandlers: [
      {
        channel: 'terminal:git-status',
        handler: async (_event, payload) => gitService.gitStatus(payload),
      },
      {
        channel: 'terminal:git-diff',
        handler: async (_event, payload) => gitService.gitDiff(payload),
      },
      {
        channel: 'terminal:git-branches',
        handler: async (_event, payload) => gitService.gitBranches(payload),
      },
      {
        channel: 'terminal:git-create-branch',
        handler: async (_event, payload) => gitService.gitCreateBranch(payload),
      },
      {
        channel: 'terminal:git-checkout-branch',
        handler: async (_event, payload) => gitService.gitCheckoutBranch(payload),
      },
      {
        channel: 'terminal:git-delete-branch',
        handler: async (_event, payload) => gitService.gitDeleteBranch(payload),
      },
      {
        channel: 'terminal:git-pull',
        handler: async (_event, payload) => gitService.gitPull(payload),
      },
      {
        channel: 'terminal:git-commit',
        handler: async (_event, payload) => gitService.gitCommit(payload),
      },
      {
        channel: 'terminal:git-push',
        handler: async (_event, payload) => gitService.gitPush(payload),
      },
      {
        channel: 'terminal:git-push-sync',
        handler: async (_event, payload) => gitService.gitPushSync(payload),
      },
      {
        channel: 'terminal:git-log',
        handler: async (_event, payload) => gitService.gitLog(payload),
      },
      {
        channel: 'terminal:git-tags',
        handler: async (_event, payload) => gitService.gitTags(payload),
      },
      {
        channel: 'terminal:git-stash',
        handler: async (_event, payload) => gitService.gitStash(payload),
      },
      {
        channel: 'terminal:git-remote',
        handler: async (_event, payload) => gitService.gitRemote(payload),
      },
      {
        channel: 'terminal:git-show',
        handler: async (_event, payload) => gitService.gitShow(payload),
      },
    ],
  };
}

export default createToolPackage;
