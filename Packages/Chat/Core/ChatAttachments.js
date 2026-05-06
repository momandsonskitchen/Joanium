import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';

const MAX_FILES = 6;
const MAX_BYTES = 512 * 1024;
const MAX_TEXT_CHARS = 45000;

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.mdx',
  '.log',
  '.csv',
  '.tsv',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
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
  '.php',
  '.sql',
  '.sh',
  '.ps1',
  '.bat',
  '.env',
  '.ini',
  '.conf',
  '.graphql',
  '.gql'
]);

function summarizeText(fileName, text) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === '.json') {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return `${parsed.length} JSON items`;
      return `${Object.keys(parsed ?? {}).length} JSON keys`;
    } catch {
      return 'JSON text';
    }
  }

  if (ext === '.csv' || ext === '.tsv') {
    const rows = text.trim() ? text.trim().split(/\r?\n/).length : 0;
    return rows > 1 ? `${rows - 1} data rows` : `${rows} row`;
  }

  return `${text.split(/\r?\n/).length} lines`;
}

function enrichText(fileName, text) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === '.json') {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }

  return text;
}

export async function readAttachmentFiles(filePaths = []) {
  const attachments = [];
  const rejected = [];

  for (const filePath of filePaths.slice(0, MAX_FILES)) {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    if (!TEXT_EXTENSIONS.has(ext)) {
      rejected.push({ fileName, reason: 'unsupported' });
      continue;
    }

    let fileStats;
    try {
      fileStats = await stat(filePath);
    } catch {
      rejected.push({ fileName, reason: 'unreadable' });
      continue;
    }

    if (!fileStats.isFile()) {
      rejected.push({ fileName, reason: 'not-file' });
      continue;
    }

    if (fileStats.size > MAX_BYTES) {
      rejected.push({ fileName, reason: 'too-large' });
      continue;
    }

    try {
      const rawText = await readFile(filePath, 'utf8');
      const enriched = enrichText(fileName, rawText);
      const text = enriched.length > MAX_TEXT_CHARS
        ? `${enriched.slice(0, MAX_TEXT_CHARS)}\n\n[Truncated]`
        : enriched;

      attachments.push({
        id: randomUUID(),
        name: fileName,
        path: filePath,
        size: fileStats.size,
        summary: summarizeText(fileName, rawText),
        text
      });
    } catch {
      rejected.push({ fileName, reason: 'unreadable' });
    }
  }

  if (filePaths.length > MAX_FILES) {
    rejected.push({ fileName: `${filePaths.length - MAX_FILES} more`, reason: 'too-many' });
  }

  return { attachments, rejected };
}
