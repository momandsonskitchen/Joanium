import path from 'node:path';
import { appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bootstrapApplication } from './Packages/Index.js';
import { DebugLogger } from './Packages/Shared/Index.js';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
DebugLogger.configureDebugLogger({ rootDirectory });

function writeBootLog(message, details = '') {
  try {
    // In packaged builds, rootDirectory resolves inside the read-only asar archive.
    // process.resourcesPath is the writable resources/ folder next to the executable.
    // In dev, process.resourcesPath is undefined so we fall back to Build/Logs.
    const logDirectory = process.resourcesPath
      ? path.join(process.resourcesPath, 'Logs')
      : path.join(rootDirectory, 'Build', 'Logs');
    mkdirSync(logDirectory, { recursive: true });
    const suffix = details ? ` ${details}` : '';
    appendFileSync(
      path.join(logDirectory, 'electron-app.log'),
      `[${new Date().toISOString()}] ${message}${suffix}\n`,
      'utf8',
    );
  } catch {
    // Ignore logging failures during boot diagnostics.
  }
}

process.on('uncaughtException', (error) => {
  writeBootLog('uncaughtException', error?.stack ?? String(error));
});

process.on('unhandledRejection', (error) => {
  writeBootLog('unhandledRejection', error?.stack ?? String(error));
});

writeBootLog('App:start');
DebugLogger.debugLog('App', 'Starting Joanium', { rootDirectory });

try {
  await bootstrapApplication();
  writeBootLog('App:bootstrapApplication-resolved');
  DebugLogger.debugLog('App', 'bootstrapApplication resolved');
} catch (error) {
  writeBootLog('App:bootstrapApplication-rejected', error?.stack ?? String(error));
  DebugLogger.debugLog('App', 'bootstrapApplication rejected', error?.stack ?? String(error));
  throw error;
}
