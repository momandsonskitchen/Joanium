import path from 'node:path';
import { appendFileSync, mkdirSync } from 'node:fs';

export function appendTimestampedLog(logFilePath, message, details = '') {
  try {
    mkdirSync(path.dirname(logFilePath), { recursive: true });
    const suffix = details ? ` ${details}` : '';
    appendFileSync(logFilePath, `[${new Date().toISOString()}] ${message}${suffix}\n`, 'utf8');
  } catch {
    // File logging must never block app startup or runtime behavior.
  }
}

export function createTimestampedFileLogger(getLogFilePath) {
  return function writeLog(message, details = '') {
    const logFilePath = getLogFilePath();
    if (!logFilePath) return;
    appendTimestampedLog(logFilePath, message, details);
  };
}
