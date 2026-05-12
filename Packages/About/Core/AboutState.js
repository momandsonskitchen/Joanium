import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { collectSystemInfo } from './SystemInfo.js';

export function createAboutStateManager({ rootDirectory }) {
  return {
    async getInfo() {
      const system = await collectSystemInfo(rootDirectory);

      try {
        const packageJson = JSON.parse(
          await readFile(path.join(rootDirectory, 'Package.json'), 'utf8'),
        );

        return {
          name: packageJson.name ?? 'Joanium',
          version: packageJson.version ?? '',
          description: packageJson.description ?? '',
          author: packageJson.author ?? '',
          system,
        };
      } catch {
        return {
          name: 'Joanium',
          version: '',
          description: '',
          author: '',
          system,
        };
      }
    },
  };
}
