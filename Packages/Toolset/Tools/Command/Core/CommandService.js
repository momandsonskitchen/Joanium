import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BUFFER_LIMIT,
  DEFAULT_TIMEOUT,
  MAX_TIMEOUT,
  OUTPUT_LIMIT,
  buildExecInvocation,
  buildPackageScriptCommand,
  execPromise,
  inspectWorkspaceSummary,
  normalizeBool,
  requireString,
  resolveDirectory,
} from '../../../Utils/WorkspaceUtils.js';

const COMMAND_RISK_RULES = [
  { level: 'critical', pattern: /\brm\s+-rf\s+\/(?!\w)/i, reason: 'Deletes the filesystem root.' },
  { level: 'critical', pattern: /\b(format|mkfs)\b/i, reason: 'Formats a disk or filesystem.' },
  { level: 'critical', pattern: /\bdd\s+if=.*of=\/dev/i, reason: 'Writes raw data to a device.' },
  {
    level: 'critical',
    pattern: /\b(shutdown|reboot|halt)\b/i,
    reason: 'Shuts down or reboots the machine.',
  },
  {
    level: 'critical',
    pattern: /\b(del|erase)\b\s+\/(s|q)/i,
    reason: 'Bulk-deletes files through the shell.',
  },
  {
    level: 'critical',
    pattern: /\bRemove-Item\b.*-Recurse.*-Force/i,
    reason: 'Force-removes files recursively.',
  },
  {
    level: 'high',
    pattern: /\bgit\s+reset\s+--hard\b/i,
    reason: 'Discards Git changes permanently.',
  },
  { level: 'high', pattern: /\bgit\s+clean\s+-f/i, reason: 'Deletes untracked files.' },
  { level: 'high', pattern: /\bgit\s+push\b.*--force/i, reason: 'Rewrites remote Git history.' },
  {
    level: 'high',
    pattern: /\bdocker\s+(system\s+prune|rm|rmi|compose\s+down)\b/i,
    reason: 'Deletes or mutates Docker resources.',
  },
  { level: 'high', pattern: /\brm\s+-rf\b/i, reason: 'Recursively deletes files.' },
  {
    level: 'medium',
    pattern: /\bgit\s+(push|merge|tag)\b/i,
    reason: 'Mutates Git history or a remote repository.',
  },
  {
    level: 'medium',
    pattern: /\b(npm|pnpm|yarn|bun)\s+publish\b/i,
    reason: 'Publishes a package.',
  },
];

function severityRank(level) {
  return { low: 0, medium: 1, high: 2, critical: 3 }[level] ?? 0;
}

export function assessCommandRisk(command = '') {
  const normalizedCommand = String(command ?? '').trim();
  let level = 'low';
  const reasons = [];

  for (const rule of COMMAND_RISK_RULES) {
    if (rule.pattern.test(normalizedCommand)) {
      reasons.push(rule.reason);
      if (severityRank(rule.level) > severityRank(level)) {
        level = rule.level;
      }
    }
  }

  return {
    command: normalizedCommand,
    level,
    reasons,
    blocked: level === 'critical',
    requiresOptIn: level === 'high',
  };
}

export function createCommandService({ rootDirectory }) {
  const fallbackDirectory = rootDirectory || process.cwd();
  const activeProcesses = new Map();
  const processBuffers = new Map();

  function appendProcessBuffer(processId, text) {
    const previous = processBuffers.get(processId) ?? '';
    const next = previous + text;
    processBuffers.set(
      processId,
      next.length > BUFFER_LIMIT ? next.slice(next.length - BUFFER_LIMIT) : next,
    );
  }

  function sendToRenderer(sender, channel, payload) {
    if (!sender || sender.isDestroyed()) {
      return;
    }
    sender.send(channel, payload);
  }

  function prepareCommandExecution(payload = {}) {
    const commandError = requireString(payload.command, 'No command provided.');
    if (commandError) return commandError;

    const risk = assessCommandRisk(payload.command);
    if (risk.blocked) {
      return { ok: false, error: 'Blocked: command matches a critical destructive pattern.', risk };
    }
    if (risk.requiresOptIn && !normalizeBool(payload.allowRisky)) {
      return { ok: false, error: 'Command is high-risk and needs explicit opt-in.', risk };
    }

    const cwd = resolveDirectory(payload.cwd, fallbackDirectory);
    return { ok: true, command: payload.command, cwd, risk };
  }

  async function runCommand(payload = {}) {
    const commandRequest = prepareCommandExecution(payload);
    if (!commandRequest.ok) return commandRequest;

    const timeout = Math.min(
      Math.max(Number(payload.timeout) || DEFAULT_TIMEOUT, 1000),
      MAX_TIMEOUT,
    );
    const { command, cwd, risk } = commandRequest;
    const { cmd, options } = buildExecInvocation(command);
    const result = await execPromise(cmd, {
      cwd,
      timeout,
      maxBuffer: OUTPUT_LIMIT * 4,
      ...options,
    });

    return {
      ...result,
      command,
      cwd,
      risk,
    };
  }

  function spawnCommand(payload = {}, sender) {
    const commandRequest = prepareCommandExecution(payload);
    if (!commandRequest.ok) return commandRequest;
    const { command, cwd, risk } = commandRequest;
    const processId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const child =
      process.platform === 'win32'
        ? spawn(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
            { cwd, env: { ...process.env } },
          )
        : spawn(command, {
            cwd,
            shell: true,
            env: { ...process.env, FORCE_COLOR: '1' },
          });

    activeProcesses.set(processId, child);
    processBuffers.set(processId, '');

    const spawnTimeout = Math.min(
      Math.max(Number(payload.timeout) || DEFAULT_TIMEOUT, 1000),
      MAX_TIMEOUT,
    );
    const timeoutHandle = setTimeout(() => {
      if (activeProcesses.has(processId)) {
        child.kill();
        activeProcesses.delete(processId);
        appendProcessBuffer(processId, `\nProcess timed out after ${spawnTimeout / 1000}s.\n`);
        sendToRenderer(sender, 'terminal:process-output', {
          processId,
          stream: 'stderr',
          text: `\nProcess timed out after ${spawnTimeout / 1000}s.\n`,
        });
        sendToRenderer(sender, 'terminal:process-exit', {
          processId,
          code: null,
          signal: 'SIGTERM',
          running: false,
          timedOut: true,
        });
      }
    }, spawnTimeout);
    child.once('exit', () => clearTimeout(timeoutHandle));

    const onOutput = (stream, chunk) => {
      const text = chunk.toString();
      appendProcessBuffer(processId, text);
      sendToRenderer(sender, 'terminal:process-output', {
        processId,
        stream,
        text,
      });
    };

    child.stdout.on('data', (chunk) => onOutput('stdout', chunk));
    child.stderr.on('data', (chunk) => onOutput('stderr', chunk));
    child.once('error', (error) => {
      appendProcessBuffer(processId, `${error.message}\n`);
      sendToRenderer(sender, 'terminal:process-output', {
        processId,
        stream: 'stderr',
        text: `${error.message}\n`,
      });
    });
    child.once('exit', (code, signal) => {
      activeProcesses.delete(processId);
      sendToRenderer(sender, 'terminal:process-exit', {
        processId,
        code,
        signal,
        running: false,
      });
    });

    return { ok: true, processId, command, cwd, running: true, risk };
  }

  function writeProcess(processId, data) {
    const child = activeProcesses.get(processId);
    if (!child) {
      return { ok: false, error: 'Process not found.' };
    }
    child.stdin.write(String(data ?? ''));
    return { ok: true };
  }

  function killProcess(processId) {
    const child = activeProcesses.get(processId);
    if (!child) {
      return { ok: false, error: 'Process not found.' };
    }
    child.kill();
    activeProcesses.delete(processId);
    return { ok: true };
  }

  function readProcessOutput(processId) {
    if (!processId) {
      return { ok: false, error: 'No process id provided.' };
    }
    const buffer = processBuffers.get(processId);
    if (buffer === undefined) {
      return { ok: false, error: 'Process output was not found.' };
    }
    return {
      ok: true,
      processId,
      buffer,
      running: activeProcesses.has(processId),
    };
  }

  function resolveDirectoryChange(payload = {}) {
    const current = String(payload.cwd ?? '').trim() || os.homedir();
    const target = String(payload.target ?? '').trim();
    const resolved =
      !target || target === '~'
        ? os.homedir()
        : target.startsWith('~/')
          ? path.join(os.homedir(), target.slice(2))
          : path.resolve(current, target);

    try {
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        return { ok: false, error: `cd: not a directory: ${target}` };
      }
      return { ok: true, cwd: resolved };
    } catch {
      return { ok: false, error: `cd: no such file or directory: ${target}` };
    }
  }

  async function runProjectChecks(payload = {}) {
    const workingDir = payload.workingDir || payload.working_directory;
    const rootError = requireString(workingDir, 'No working directory provided.');
    if (rootError) return rootError;

    let summary;
    try {
      summary = inspectWorkspaceSummary(workingDir);
    } catch (error) {
      return { ok: false, error: error?.message ?? String(error) };
    }

    const commands = [];
    const scripts = summary.packageScripts ?? {};

    if (summary.packageManager && Object.keys(scripts).length > 0) {
      if (payload.includeLint !== false && scripts.lint) {
        commands.push({
          label: 'lint',
          command: buildPackageScriptCommand(summary.packageManager, 'lint'),
        });
      }
      if (
        payload.includeTest !== false &&
        scripts.test &&
        !/no test specified/i.test(scripts.test)
      ) {
        commands.push({
          label: 'test',
          command: buildPackageScriptCommand(summary.packageManager, 'test'),
        });
      }
      if (payload.includeBuild !== false && scripts.build) {
        commands.push({
          label: 'build',
          command: buildPackageScriptCommand(summary.packageManager, 'build'),
        });
      }
    }

    if (commands.length === 0) {
      return {
        ok: false,
        error: 'No runnable lint, test, or build commands were detected.',
        summary,
        commands: [],
      };
    }

    const results = [];
    for (const command of commands) {
      const result = await runCommand({
        command: command.command,
        cwd: summary.path,
        timeout: command.label === 'build' ? 120_000 : 90_000,
        allowRisky: false,
      });
      results.push({ ...command, ...result, passed: result.exitCode === 0 && !result.timedOut });
    }

    return {
      ok: results.every((result) => result.passed),
      summary,
      commands: results,
    };
  }

  return {
    getDefaultCwd: () => fallbackDirectory,
    assessCommandRisk,
    runCommand,
    spawnCommand,
    writeProcess,
    killProcess,
    readProcessOutput,
    resolveDirectoryChange,
    runProjectChecks,
  };
}
