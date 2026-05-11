import path from 'node:path';
import { app } from 'electron';

export function getWritableDataDirectory(rootDirectory) {
  return app.isPackaged ? app.getPath('userData') : path.join(rootDirectory, 'Data');
}

export function getWritableResourceDirectory(rootDirectory, resourceName) {
  return app.isPackaged
    ? path.join(app.getPath('userData'), resourceName)
    : path.join(rootDirectory, resourceName);
}

export function getBundledResourceDirectory(rootDirectory, resourceName) {
  return app.isPackaged
    ? path.join(process.resourcesPath, resourceName)
    : path.join(rootDirectory, resourceName);
}
