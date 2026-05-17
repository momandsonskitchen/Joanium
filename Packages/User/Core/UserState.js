import path from 'node:path';
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { mergeUserStates, readUserState, writeUserState } from '../../Shared/UserData/UserData.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

const AVATAR_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif'];

export function createUserStateManager({ rootDirectory }) {
  // Serialise all read-modify-write operations through a promise chain so
  // concurrent IPC calls never race on the same .tmp file.
  let writeQueue = Promise.resolve();

  function enqueue(fn) {
    writeQueue = writeQueue.then(fn, fn);
    return writeQueue;
  }

  return {
    async getProfile() {
      const state = await readUserState(rootDirectory);
      return state.profile;
    },

    async saveProfile(profile) {
      return enqueue(async () => {
        const current = await readUserState(rootDirectory);
        const next = mergeUserStates(current, { profile });
        await writeUserState(rootDirectory, next);
        return next.profile;
      });
    },

    async getCustomInstructions() {
      const state = await readUserState(rootDirectory);
      return state.customInstructions ?? '';
    },

    async saveCustomInstructions(customInstructions) {
      return enqueue(async () => {
        const current = await readUserState(rootDirectory);
        const next = mergeUserStates(current, {
          customInstructions: String(customInstructions ?? '').trim(),
        });
        await writeUserState(rootDirectory, next);
        return next.customInstructions;
      });
    },

    async saveAvatar(sourcePath) {
      return enqueue(async () => {
        const ext = path.extname(sourcePath).toLowerCase() || '.png';
        const dataDir = getWritableDataDirectory(rootDirectory);
        await mkdir(dataDir, { recursive: true });

        for (const e of AVATAR_EXTENSIONS) {
          if (e !== ext) {
            await unlink(path.join(dataDir, `Avatar${e}`)).catch(() => {});
          }
        }

        const targetPath = path.join(dataDir, `Avatar${ext}`);
        await copyFile(sourcePath, targetPath);

        const current = await readUserState(rootDirectory);
        const next = mergeUserStates(current, {
          profile: { ...current.profile, avatarPath: targetPath },
        });
        await writeUserState(rootDirectory, next);
        return targetPath;
      });
    },

    async removeAvatar() {
      return enqueue(async () => {
        const current = await readUserState(rootDirectory);
        const dataDir = getWritableDataDirectory(rootDirectory);

        for (const ext of AVATAR_EXTENSIONS) {
          await unlink(path.join(dataDir, `Avatar${ext}`)).catch(() => {});
        }

        const next = mergeUserStates(current, {
          profile: { ...current.profile, avatarPath: null },
        });
        await writeUserState(rootDirectory, next);
      });
    },
  };
}
