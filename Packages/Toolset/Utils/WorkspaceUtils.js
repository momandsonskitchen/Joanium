import { exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const OUTPUT_LIMIT = 128_000;
export const BUFFER_LIMIT = 96_000;
export const MAX_FILE_SIZE = 512_000;
export const DEFAULT_TIMEOUT = 30_000;
export const MAX_TIMEOUT = 300_000;

export const WORKSPACE_SKIP_DIRS = new Set([
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
  'temp',
]);

export const TEXT_EXTENSIONS = new Set([
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
  '.astro',
]);

export function truncateText(text, maxLength = OUTPUT_LIMIT) {
  const value = String(text ?? '');
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}\n\n...(truncated, ${value.length} characters total)`;
}

export function resolveDirectory(inputPath, fallbackDirectory) {
  const candidate = String(inputPath ?? '').trim();
  const fallback = fallbackDirectory || os.homedir();

  if (!candidate) {
    return path.resolve(fallback);
  }

  return path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(fallback, candidate);
}

export function isPathInsideDirectory(childPath, parentDirectory) {
  const resolvedChild = path.resolve(childPath);
  const resolvedParent = path.resolve(parentDirectory);
  const child = process.platform === 'win32' ? resolvedChild.toLowerCase() : resolvedChild;
  const parent = process.platform === 'win32' ? resolvedParent.toLowerCase() : resolvedParent;
  const relativePath = path.relative(parent, child);

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function requireString(value, message) {
  return String(value ?? '').trim() ? null : { ok: false, error: message };
}

export function normalizeBool(value) {
  return value === true || value === 'true';
}

export function buildExecInvocation(command) {
  if (process.platform === 'win32') {
    return {
      cmd: `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ${JSON.stringify(command)}`,
      options: { env: { ...process.env } },
    };
  }

  return {
    cmd: command,
    options: {
      shell: process.env.SHELL || '/bin/bash',
      env: { ...process.env, FORCE_COLOR: '1' },
    },
  };
}

export function isProbablyTextFile(filePath) {
  const baseName = path.basename(filePath).toLowerCase();
  return (
    baseName === 'dockerfile' ||
    baseName === 'makefile' ||
    baseName === '.gitignore' ||
    TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())
  );
}

export function walkWorkspaceFiles(rootPath, maxFiles = 4000) {
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

export function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    return null;
  }

  return null;
}

export function detectPackageManager(rootPath, entryNames) {
  const names = new Set(entryNames);
  if (names.has('pnpm-lock.yaml')) return 'pnpm';
  if (names.has('yarn.lock')) return 'yarn';
  if (names.has('bun.lockb') || names.has('bun.lock')) return 'bun';
  if (names.has('package-lock.json') || fs.existsSync(path.join(rootPath, 'package.json'))) {
    return 'npm';
  }
  return '';
}

export function buildPackageScriptCommand(packageManager, scriptName) {
  if (!packageManager || !scriptName) return '';
  if (packageManager === 'yarn') return `yarn ${scriptName}`;
  if (packageManager === 'bun') return `bun run ${scriptName}`;
  return `${packageManager} run ${scriptName}`;
}

export function protectedDeleteReason(resolvedPath) {
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

export function inspectWorkspaceSummary(rootPath) {
  const root = resolveDirectory(rootPath, process.cwd());
  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`"${root}" is not a directory.`);
  }

  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const entryNames = entries.map((entry) => entry.name);
  const packageJson = readJson(path.join(root, 'package.json'));
  const packageManager = detectPackageManager(root, entryNames);
  const scripts = packageJson?.scripts ?? {};
  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };
  const frameworks = Object.keys(dependencies).filter((name) =>
    ['react', 'next', 'vue', 'svelte', 'electron', 'express', 'vite'].includes(name),
  );
  const languages = [];

  if (packageJson) languages.push('javascript');
  if (fs.existsSync(path.join(root, 'tsconfig.json'))) languages.push('typescript');
  if (
    fs.existsSync(path.join(root, 'pyproject.toml')) ||
    fs.existsSync(path.join(root, 'requirements.txt'))
  ) {
    languages.push('python');
  }
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) languages.push('rust');
  if (fs.existsSync(path.join(root, 'go.mod'))) languages.push('go');

  return {
    path: root,
    packageManager,
    topEntries: entries.slice(0, 80),
    packageScripts: scripts,
    frameworks,
    languages,
    notes: [
      scripts.dev || scripts.start ? 'Has a development/start workflow.' : '',
      scripts.test ? 'Has a test script.' : '',
      scripts.build ? 'Has a build script.' : '',
    ].filter(Boolean),
  };
}

export function execPromise(command, options) {
  return new Promise((resolve) => {
    exec(command, options, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: truncateText(stdout || ''),
        stderr: truncateText(stderr || ''),
        exitCode: typeof error?.code === 'number' ? error.code : 0,
        timedOut: Boolean(error?.killed),
      });
    });
  });
}
