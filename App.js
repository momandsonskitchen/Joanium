import path from 'node:path';
import { appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bootstrapApplication } from './Packages/Index.js';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

function writeBootLog(message, details = '') {
  try {
    const logDirectory = path.join(rootDirectory, 'Build', 'Logs');
    mkdirSync(logDirectory, { recursive: true });
    const suffix = details ? ` ${details}` : '';
    appendFileSync(
      path.join(logDirectory, 'electron-app.log'),
      `[${new Date().toISOString()}] ${message}${suffix}\n`,
      'utf8'
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

try {
  await bootstrapApplication();
  writeBootLog('App:bootstrapApplication-resolved');
} catch (error) {
  writeBootLog('App:bootstrapApplication-rejected', error?.stack ?? String(error));
  throw error;
}
