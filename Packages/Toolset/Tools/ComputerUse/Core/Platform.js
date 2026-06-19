import { execFile } from 'node:child_process';
import os from 'node:os';
import process from 'node:process';
import { promisify } from 'node:util';
import strings from '../I18n/en.js';

const execFileAsync = promisify(execFile);

export function getPlatform() {
  return os.platform();
}

export function requireWindows() {
  if (getPlatform() !== 'win32') {
    throw new Error(strings.errors.platformNotSupported);
  }
}

export function requireMacOS() {
  if (getPlatform() !== 'darwin') {
    throw new Error(strings.errors.platformNotSupported);
  }
}

export function formatError(error) {
  const message = error?.message ?? String(error);
  const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';

  if (!stderr || message.includes(stderr)) {
    return message;
  }

  return `${message}: ${stderr}`;
}

function getPowerShellExecutable() {
  if (getPlatform() !== 'win32') {
    return 'powershell';
  }

  const systemRoot = process.env.SystemRoot || process.env.windir;
  return systemRoot
    ? `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : 'powershell.exe';
}

export function runCommand(command, args = [], timeout = 5000) {
  return execFileAsync(command, args, {
    timeout,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

export function runPowerShell(script, timeout = 5000) {
  return runCommand(
    getPowerShellExecutable(),
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    timeout,
  );
}

export function runAppleScript(script, timeout = 5000) {
  return runCommand('osascript', ['-e', script], timeout);
}

export function quotePowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function quoteAppleScript(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function roundCoordinate(value) {
  return Math.round(Number(value));
}

export function toJsonOutput(value) {
  return JSON.stringify(value, null, 2);
}
