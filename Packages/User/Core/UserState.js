import path from 'node:path';
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { mergeUserStates, readUserState, writeUserState } from '../../Shared/UserData/UserData.js';

const AVATAR_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif'];

export function createUserStateManager({ rootDirectory }) {
  return {
    async getProfile() {
      const state = await readUserState(rootDirectory);
      return state.profile;
    },

    async saveProfile(profile) {
      const current = await readUserState(rootDirectory);
      const next = mergeUserStates(current, { profile });
      await writeUserState(rootDirectory, next);
      return next.profile;
    },

    async getCustomInstructions() {
      const state = await readUserState(rootDirectory);
      return state.customInstructions ?? '';
    },

    async saveCustomInstructions(customInstructions) {
      const current = await readUserState(rootDirectory);
      const next = mergeUserStates(current, {
        customInstructions: String(customInstructions ?? '').trim()
      });
      await writeUserState(rootDirectory, next);
      return next.customInstructions;
    },

    async saveAvatar(sourcePath) {
      const ext = path.extname(sourcePath).toLowerCase() || '.png';
      const dataDir = path.join(rootDirectory, 'Data');
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
        profile: { ...current.profile, avatarPath: targetPath }
      });
      await writeUserState(rootDirectory, next);
      return targetPath;
    },

    async removeAvatar() {
      const current = await readUserState(rootDirectory);
      const dataDir = path.join(rootDirectory, 'Data');

      for (const ext of AVATAR_EXTENSIONS) {
        await unlink(path.join(dataDir, `Avatar${ext}`)).catch(() => {});
      }

      const next = mergeUserStates(current, {
        profile: { ...current.profile, avatarPath: null }
      });
      await writeUserState(rootDirectory, next);
    }
  };
}
