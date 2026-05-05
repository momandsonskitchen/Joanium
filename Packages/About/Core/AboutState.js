import path from 'node:path';
import { readFile } from 'node:fs/promises';

export function createAboutStateManager({ rootDirectory }) {
  return {
    async getInfo() {
      try {
        const packageJson = JSON.parse(
          await readFile(path.join(rootDirectory, 'Package.json'), 'utf8')
        );

        return {
          name: packageJson.name ?? 'Joanium',
          version: packageJson.version ?? '',
          description: packageJson.description ?? '',
          author: packageJson.author ?? '',
          license: packageJson.license ?? '',
          framework: 'Electron 41'
        };
      } catch {
        return {
          name: 'Joanium',
          version: '',
          description: '',
          author: '',
          license: '',
          framework: 'Electron'
        };
      }
    }
  };
}
