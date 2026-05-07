import { exec, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OUTPUT_LIMIT = 128_000;
const BUFFER_LIMIT = 96_000;
const MAX_FILE_SIZE = 512_000;
const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 300_000;

const WORKSPACE_SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  '.turbo',
  '.parcel-cache',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  'target',
  'bin',
  'obj',
  'vendor',
  'tmp',
  'temp'
]);

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.txt',
  '.log',
  '.env',
  '.yml',
  '.yaml',
  '.toml',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.sql',
  '.graphql',
  '.sh',
  '.ps1',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.cs',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.vue',
  '.svelte',
  '.astro'
]);

const COMMAND_RISK_RULES = [
  { level: 'critical', pattern: /\brm\s+-rf\s+\/(?!\w)/i, reason: 'Deletes the filesystem root.' },
  { level: 'critical', pattern: /\b(format|mkfs)\b/i, reason: 'Formats a disk or filesystem.' },
  { level: 'critical', pattern: /\bdd\s+if=.*of=\/dev/i, reason: 'Writes raw data to a device.' },
  { level: 'critical', pattern: /\b(shutdown|reboot|halt)\b/i, reason: 'Shuts down or reboots the machine.' },
  { level: 'critical', pattern: /\b(del|erase)\b\s+\/(s|q)/i, reason: 'Bulk-deletes files through the shell.' },
  { level: 'critical', pattern: /\bRemove-Item\b.*-Recurse.*-Force/i, reason: 'Force-removes files recursively.' },
  { level: 'high', pattern: /\bgit\s+reset\s+--hard\b/i, reason: 'Discards Git changes permanently.' },
  { level: 'high', pattern: /\bgit\s+clean\s+-f/i, reason: 'Deletes untracked files from the repository.' },
  { level: 'high', pattern: /\bgit\s+push\b.*--force/i, reason: 'Rewrites remote Git history.' },
  { level: 'high', pattern: /\bdocker\s+(system\s+prune|rm|rmi|compose\s+down)\b/i, reason: 'Deletes or mutates Docker resources.' },
  { level: 'high', pattern: /\brm\s+-rf\b/i, reason: 'Recursively deletes files.' },
  { level: 'medium', pattern: /\bgit\s+(push|merge|tag)\b/i, reason: 'Mutates Git history or a remote repository.' },
  { level: 'medium', pattern: /\b(npm|pnpm|yarn|bun)\s+publish\b/i, reason: 'Publishes a package.' }
];

function truncateText(text, maxLength = OUTPUT_LIMIT) {
  const value = String(text ?? '');
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}\n\n...(truncated, ${value.length} characters total)`;
}

function resolveDirectory(inputPath, fallbackDirectory) {
  const candidate = String(inputPath ?? '').trim();
  return path.resolve(candidate || fallbackDirectory || os.homedir());
}

function requireString(value, message) {
  return String(value ?? '').trim() ? null : { ok: false, error: message };
}

function normalizeBool(value) {
  return value === true || value === 'true';
}

function severityRank(level) {
  return { low: 0, medium: 1, high: 2, critical: 3 }[level] ?? 0;
}

function getShellPath() {
  return process.platform === 'win32'
    ? process.env.ComSpec || 'cmd.exe'
    : process.env.SHELL || '/bin/bash';
}

function isProbablyTextFile(filePath) {
  const baseName = path.basename(filePath).toLowerCase();
  return (
    baseName === 'dockerfile' ||
    baseName === 'makefile' ||
    baseName === '.gitignore' ||
    TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())
  );
}

function walkWorkspaceFiles(rootPath, maxFiles = 4000) {
  const root = resolveDirectory(rootPath, process.cwd());
  const files = [];
  const stack = [root];

  while (stack.length > 0 && files.length < maxFiles) {
    const currentPath = stack.pop();
    let entries = [];

    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name === '.' || entry.name === '..' || entry.isSymbolicLink?.()) {
        continue;
      }

      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (!WORKSPACE_SKIP_DIRS.has(entry.name)) {
          stack.push(absolutePath);
        }
      } else if (entry.isFile()) {
        files.push(absolutePath);
        if (files.length >= maxFiles) {
          break;
        }
      }
    }
  }

  return { root, files };
}

function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    return null;
  }
  return null;
}

function detectPackageManager(rootPath, entryNames) {
  const names = new Set(entryNames);
  if (names.has('pnpm-lock.yaml')) return 'pnpm';
  if (names.has('yarn.lock')) return 'yarn';
  if (names.has('bun.lockb') || names.has('bun.lock')) return 'bun';
  if (names.has('package-lock.json') || fs.existsSync(path.join(rootPath, 'package.json'))) return 'npm';
  return '';
}

function buildPackageScriptCommand(packageManager, scriptName) {
  if (!packageManager || !scriptName) return '';
  if (packageManager === 'yarn') return `yarn ${scriptName}`;
  if (packageManager === 'bun') return `bun run ${scriptName}`;
  return `${packageManager} run ${scriptName}`;
}

function protectedDeleteReason(resolvedPath) {
  if (resolvedPath === path.parse(resolvedPath).root) {
    return 'Refusing to delete the filesystem root.';
  }
  if (resolvedPath === os.homedir()) {
    return 'Refusing to delete the home directory.';
  }
  if (path.basename(resolvedPath).toLowerCase() === '.git') {
    return 'Refusing to delete a .git directory.';
  }
  return '';
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
    requiresOptIn: level === 'high'
  };
}

export function createTerminalService({ rootDirectory }) {
  const fallbackDirectory = rootDirectory || process.cwd();
  const activeProcesses = new Map();
  const processBuffers = new Map();

  function appendProcessBuffer(processId, text) {
    const previous = processBuffers.get(processId) ?? '';
    const next = previous + text;
    processBuffers.set(processId, next.length > BUFFER_LIMIT ? next.slice(next.length - BUFFER_LIMIT) : next);
  }

  function sendToRenderer(sender, channel, payload) {
    if (!sender || sender.isDestroyed()) {
      return;
    }
    sender.send(channel, payload);
  }

  async function runCommand(payload = {}) {
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
    const timeout = Math.min(Math.max(Number(payload.timeout) || DEFAULT_TIMEOUT, 1000), MAX_TIMEOUT);

    return new Promise((resolve) => {
      exec(
        payload.command,
        {
          cwd,
          timeout,
          maxBuffer: OUTPUT_LIMIT * 4,
          shell: getShellPath(),
          env: { ...process.env, FORCE_COLOR: '1' }
        },
        (error, stdout, stderr) => {
          resolve({
            ok: !error,
            command: payload.command,
            cwd,
            stdout: truncateText(stdout || ''),
            stderr: truncateText(stderr || ''),
            exitCode: typeof error?.code === 'number' ? error.code : 0,
            timedOut: Boolean(error?.killed),
            risk
          });
        }
      );
    });
  }

  function spawnCommand(payload = {}, sender) {
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
    const processId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const child = spawn(payload.command, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    activeProcesses.set(processId, child);
    processBuffers.set(processId, '');

    const onOutput = (streamName, chunk) => {
      const text = chunk.toString();
      appendProcessBuffer(processId, text);
      sendToRenderer(sender, 'terminal:process-output', {
        processId,
        stream: streamName,
        text
      });
    };

    child.stdout.on('data', (chunk) => onOutput('stdout', chunk));
    child.stderr.on('data', (chunk) => onOutput('stderr', chunk));
    child.once('error', (error) => {
      appendProcessBuffer(processId, `${error.message}\n`);
      sendToRenderer(sender, 'terminal:process-output', {
        processId,
        stream: 'stderr',
        text: `${error.message}\n`
      });
    });
    child.once('exit', (code, signal) => {
      activeProcesses.delete(processId);
      sendToRenderer(sender, 'terminal:process-exit', {
        processId,
        code,
        signal,
        running: false
      });
    });

    return { ok: true, processId, command: payload.command, cwd, risk };
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
      running: activeProcesses.has(processId)
    };
  }

  function readTextFile(payload = {}) {
    const fileError = requireString(payload.filePath, 'No file path provided.');
    if (fileError) return fileError;

    const resolvedPath = path.resolve(payload.filePath);
    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return { ok: false, error: `"${resolvedPath}" is not a file.` };
    }
    if (stat.size > MAX_FILE_SIZE) {
      return {
        ok: false,
        error: `File too large (${Math.round(stat.size / 1024)} KB > ${Math.round(MAX_FILE_SIZE / 1024)} KB limit).`
      };
    }

    const lines = fs.readFileSync(resolvedPath, 'utf8').split('\n');
    const maxLines = Math.min(Math.max(Number(payload.maxLines) || 200, 1), 2000);
    const slicedLines = lines.slice(0, maxLines);
    const note = lines.length > maxLines ? `\n...(showing ${maxLines} of ${lines.length} lines)` : '';

    return {
      ok: true,
      path: resolvedPath,
      content: slicedLines.join('\n') + note,
      totalLines: lines.length,
      sizeBytes: stat.size
    };
  }

  function listDirectory(payload = {}) {
    const directoryError = requireString(payload.dirPath, 'No directory path provided.');
    if (directoryError) return directoryError;

    const resolvedPath = path.resolve(payload.dirPath);
    if (!fs.statSync(resolvedPath).isDirectory()) {
      return { ok: false, error: `"${resolvedPath}" is not a directory.` };
    }

    const items = fs
      .readdirSync(resolvedPath, { withFileTypes: true })
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other',
        size: entry.isFile() ? fs.statSync(path.join(resolvedPath, entry.name)).size : null
      }))
      .sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)));

    return { ok: true, path: resolvedPath, entries: items, count: items.length };
  }

  function searchWorkspace(payload = {}) {
    const rootError = requireString(payload.rootPath, 'No workspace path provided.');
    if (rootError) return rootError;
    const queryError = requireString(payload.query, 'No search query provided.');
    if (queryError) return queryError;

    const { root, files } = walkWorkspaceFiles(payload.rootPath);
    const maxResults = Math.min(Math.max(Number(payload.maxResults) || 40, 1), 100);
    const matches = [];
    const rawQuery = String(payload.query).trim();
    const regexMatch = rawQuery.match(/^\/(.+)\/([gimsuy]*)$/);
    const matcher = regexMatch ? new RegExp(regexMatch[1], regexMatch[2]) : null;
    const needle = rawQuery.toLowerCase();

    for (const filePath of files) {
      if (matches.length >= maxResults || !isProbablyTextFile(filePath)) {
        continue;
      }

      let raw = '';
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_FILE_SIZE) continue;
        raw = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      const lines = raw.split('\n');
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (matcher) matcher.lastIndex = 0;
        if (matcher ? matcher.test(line) : line.toLowerCase().includes(needle)) {
          matches.push({
            path: path.relative(root, filePath),
            lineNumber: index + 1,
            line: line.trim().slice(0, 240)
          });
          if (matches.length >= maxResults) break;
        }
      }
    }

    return { ok: true, root, matches };
  }

  function inspectWorkspace(payload = {}) {
    const rootError = requireString(payload.rootPath, 'No workspace path provided.');
    if (rootError) return rootError;

    const root = resolveDirectory(payload.rootPath, fallbackDirectory);
    if (!fs.statSync(root).isDirectory()) {
      return { ok: false, error: `"${root}" is not a directory.` };
    }

    const entries = fs
      .readdirSync(root, { withFileTypes: true })
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const entryNames = entries.map((entry) => entry.name);
    const packageJson = readJson(path.join(root, 'package.json'));
    const packageManager = detectPackageManager(root, entryNames);
    const scripts = packageJson?.scripts ?? {};
    const dependencies = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
    const frameworks = Object.keys(dependencies).filter((name) =>
      ['react', 'next', 'vue', 'svelte', 'electron', 'express', 'vite'].includes(name)
    );
    const languages = [];

    if (packageJson) languages.push('javascript');
    if (fs.existsSync(path.join(root, 'tsconfig.json'))) languages.push('typescript');
    if (fs.existsSync(path.join(root, 'pyproject.toml')) || fs.existsSync(path.join(root, 'requirements.txt'))) {
      languages.push('python');
    }
    if (fs.existsSync(path.join(root, 'Cargo.toml'))) languages.push('rust');
    if (fs.existsSync(path.join(root, 'go.mod'))) languages.push('go');

    return {
      ok: true,
      summary: {
        path: root,
        packageManager,
        topEntries: entries.slice(0, 80),
        packageScripts: scripts,
        frameworks,
        languages,
        notes: [
          scripts.dev || scripts.start ? 'Has a development/start workflow.' : '',
          scripts.test ? 'Has a test script.' : '',
          scripts.build ? 'Has a build script.' : ''
        ].filter(Boolean)
      }
    };
  }

  async function runProjectChecks(payload = {}) {
    const workingDir = payload.workingDir || payload.working_directory;
    const rootError = requireString(workingDir, 'No working directory provided.');
    if (rootError) return rootError;

    const inspected = inspectWorkspace({ rootPath: workingDir });
    if (!inspected.ok) return inspected;

    const summary = inspected.summary;
    const commands = [];
    const scripts = summary.packageScripts ?? {};

    if (summary.packageManager && Object.keys(scripts).length > 0) {
      if (payload.includeLint !== false && scripts.lint) {
        commands.push({ label: 'lint', command: buildPackageScriptCommand(summary.packageManager, 'lint') });
      }
      if (payload.includeTest !== false && scripts.test && !/no test specified/i.test(scripts.test)) {
        commands.push({ label: 'test', command: buildPackageScriptCommand(summary.packageManager, 'test') });
      }
      if (payload.includeBuild !== false && scripts.build) {
        commands.push({ label: 'build', command: buildPackageScriptCommand(summary.packageManager, 'build') });
      }
    }

    if (commands.length === 0) {
      return { ok: false, error: 'No runnable lint, test, or build commands were detected.', summary, commands: [] };
    }

    const results = [];
    for (const command of commands) {
      const result = await runCommand({
        command: command.command,
        cwd: summary.path,
        timeout: command.label === 'build' ? 120_000 : 90_000,
        allowRisky: false
      });
      results.push({ ...command, ...result, passed: result.exitCode === 0 && !result.timedOut });
    }

    return {
      ok: results.every((result) => result.passed),
      summary,
      commands: results
    };
  }

  async function gitStatus(payload = {}) {
    const directoryError = requireString(payload.workingDir, 'No working directory provided.');
    if (directoryError) return directoryError;
    return runCommand({
      command: 'git status --short --branch',
      cwd: payload.workingDir,
      timeout: 20_000,
      allowRisky: true
    });
  }

  async function gitDiff(payload = {}) {
    const directoryError = requireString(payload.workingDir, 'No working directory provided.');
    if (directoryError) return directoryError;
    const stagedFlag = normalizeBool(payload.staged) ? '--cached ' : '';
    return runCommand({
      command: `git diff ${stagedFlag}--stat --patch --minimal --color=never`,
      cwd: payload.workingDir,
      timeout: 30_000,
      allowRisky: true
    });
  }

  function writeFile(payload = {}) {
    const fileError = requireString(payload.filePath, 'No file path provided.');
    if (fileError) return fileError;
    const resolvedPath = path.resolve(payload.filePath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    if (normalizeBool(payload.append)) {
      fs.appendFileSync(resolvedPath, payload.content ?? '', 'utf8');
    } else {
      fs.writeFileSync(resolvedPath, payload.content ?? '', 'utf8');
    }
    return { ok: true, path: resolvedPath, bytes: Buffer.byteLength(payload.content ?? '', 'utf8') };
  }

  function deleteItem(payload = {}) {
    const itemError = requireString(payload.itemPath, 'No path provided to delete.');
    if (itemError) return itemError;
    const resolvedPath = path.resolve(payload.itemPath);
    const protectedReason = protectedDeleteReason(resolvedPath);
    if (protectedReason) return { ok: false, error: protectedReason };
    if (!fs.existsSync(resolvedPath)) return { ok: false, error: 'Path does not exist.' };
    fs.rmSync(resolvedPath, { recursive: true, force: true });
    return { ok: true, path: resolvedPath };
  }

  return {
    getDefaultCwd: () => fallbackDirectory,
    assessCommandRisk,
    runCommand,
    spawnCommand,
    writeProcess,
    killProcess,
    readProcessOutput,
    readTextFile,
    listDirectory,
    searchWorkspace,
    inspectWorkspace,
    runProjectChecks,
    gitStatus,
    gitDiff,
    writeFile,
    deleteItem
  };
}
