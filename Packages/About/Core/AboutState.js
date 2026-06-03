import path from 'node:path';
import { readFile } from 'node:fs/promises';
import electron from 'electron';
import { collectSystemInfo } from './SystemInfo.js';
import { getResourceFileUrl } from '../../Shared/Storage/ResourcePaths.js';

const { app } = electron;

export function createAboutStateManager({ rootDirectory }) {
  return {
    async getInfo() {
      const system = await collectSystemInfo(rootDirectory);

      // app.getVersion() always returns the correct version in both dev and
      // packaged builds, unlike reading package.json which may be unavailable
      // inside the asar archive at runtime.
      const version = app.getVersion() ?? '';
      const logoPath = getResourceFileUrl(rootDirectory, 'Assets', 'Logo', 'Logo.png');

      try {
        const packageJson = JSON.parse(
          await readFile(path.join(rootDirectory, 'package.json'), 'utf8'),
        );

        return {
          name: packageJson.name ?? 'Joanium',
          version,
          description: packageJson.description ?? '',
          author: packageJson.author ?? '',
          logoPath,
          system,
        };
      } catch {
        return {
          name: 'Joanium',
          version,
          description: '',
          author: '',
          logoPath,
          system,
        };
      }
    },
  };
}
