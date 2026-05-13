import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import electron from 'electron';
import { collectSystemInfo } from './SystemInfo.js';

const { app } = electron;

export function createAboutStateManager({ rootDirectory }) {
  return {
    async getInfo() {
      const system = await collectSystemInfo(rootDirectory);

      // app.getVersion() always returns the correct version in both dev and
      // packaged builds, unlike reading package.json which may be unavailable
      // inside the asar archive at runtime.
      const version = app.getVersion() ?? '';

      try {
        const packageJson = JSON.parse(
          await readFile(path.join(rootDirectory, 'package.json'), 'utf8'),
        );

        return {
          name: packageJson.name ?? 'Joanium',
          version,
          description: packageJson.description ?? '',
          author: packageJson.author ?? '',
          logoPath: pathToFileURL(path.join(rootDirectory, 'Assets', 'Logo', 'Logo.png')).href,
          system,
        };
      } catch {
        return {
          name: 'Joanium',
          version,
          description: '',
          author: '',
          logoPath: pathToFileURL(path.join(rootDirectory, 'Assets', 'Logo', 'Logo.png')).href,
          system,
        };
      }
    },
  };
}
