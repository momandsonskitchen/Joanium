import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { open } from 'node:fs/promises';

const MAX_FILES = 8;
const DIRECT_TEXT_MAX_BYTES = 2 * 1024 * 1024;
const EXTRACTABLE_MAX_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 120000;

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'mdx',
  'log',
  'env',
  'json',
  'csv',
  'tsv',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html',
  'css',
  'scss',
  'less',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'cs',
  'c',
  'cpp',
  'h',
  'hpp',
  'php',
  'sql',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'bat',
  'vue',
  'svelte',
  'astro',
  'ini',
  'cfg',
  'conf',
  'graphql',
  'gql',
  'rtf',
]);

const EXTRACTABLE_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'xlsm', 'pptx']);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tiff']);

const IMAGE_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
};

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

let pdfParseModule = null;
let mammothModule = null;
let excelJsModule = null;
let jsZipModule = null;

function getExtension(fileName = '') {
  return path.extname(fileName).slice(1).toLowerCase();
}

function countLines(text = '') {
  return text ? text.split(/\r?\n/).length : 0;
}

function truncateText(text = '', maxChars = MAX_TEXT_CHARS) {
  const normalized = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .trim();

  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false };
  }

  return {
    text: `${normalized.slice(0, maxChars)}\n\n[Truncated for chat context]`,
    truncated: true,
  };
}

function buildResult({ kind, summary, text, warnings = [] }) {
  const truncated = truncateText(text);

  if (!truncated.text.trim()) {
    throw new Error('No readable text could be extracted from this file.');
  }

  return {
    kind,
    summary,
    text: truncated.text,
    lines: countLines(truncated.text),
    truncated: truncated.truncated,
    warnings,
  };
}

function decodeXmlEntities(text = '') {
  return String(text).replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (_match, entity) => {
    if (entity === 'amp') return '&';
    if (entity === 'lt') return '<';
    if (entity === 'gt') return '>';
    if (entity === 'quot') return '"';
    if (entity === 'apos') return "'";
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return '';
  });
}

function parseDelimitedLine(line, delimiter = ',') {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (const char of String(line ?? '')) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function summarizeDelimitedText(rawText, delimiter = ',') {
  const lines = rawText.trim().split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) {
    return rawText;
  }

  const headers = parseDelimitedLine(lines[0], delimiter);
  const rows = lines.slice(1);
  const preview = [lines[0], ...rows.slice(0, 8)].join('\n');
  const hiddenRows = rows.length > 8 ? `\n[${rows.length - 8} more rows omitted from preview]` : '';

  return [
    `[Table: ${rows.length} rows x ${headers.length} columns]`,
    `Columns: ${headers.join(', ')}`,
    '',
    preview + hiddenRows,
  ].join('\n');
}

function enrichTextContent(fileName, rawText) {
  const ext = getExtension(fileName);

  if (ext === 'csv' || ext === 'tsv') {
    return summarizeDelimitedText(rawText, ext === 'tsv' ? '\t' : ',');
  }

  if (ext === 'json') {
    try {
      return JSON.stringify(JSON.parse(rawText), null, 2);
    } catch {
      return rawText;
    }
  }

  if (ext === 'rtf') {
    return rawText
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\tab/g, '\t')
      .replace(/\\'[0-9a-fA-F]{2}/g, '')
      .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
      .replace(/[{}]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return rawText;
}

function summarizeTextFile(fileName, rawText) {
  const ext = getExtension(fileName);

  if (ext === 'json') {
    try {
      const parsed = JSON.parse(rawText);
      return Array.isArray(parsed)
        ? `${parsed.length} JSON items`
        : `${Object.keys(parsed ?? {}).length} JSON keys`;
    } catch {
      return 'JSON text';
    }
  }

  if (ext === 'csv' || ext === 'tsv') {
    const rows = rawText.trim() ? rawText.trim().split(/\r?\n/).length : 0;
    return rows > 1 ? `${rows - 1} data rows` : `${rows} row`;
  }

  if (ext === 'rtf') {
    return 'RTF document';
  }

  return `${countLines(rawText)} lines`;
}

function extractTextBuffer(fileName, buffer) {
  const decoded = new TextDecoder('utf-8').decode(buffer);
  const enriched = enrichTextContent(fileName, decoded);

  return buildResult({
    kind: getExtension(fileName) || 'text',
    summary: summarizeTextFile(fileName, decoded),
    text: enriched,
  });
}

async function extractPdf(buffer) {
  const pdfModule = pdfParseModule ?? (pdfParseModule = await import('pdf-parse'));

  if (typeof pdfModule.PDFParse === 'function') {
    const parser = new pdfModule.PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      const pageCount = result.total || result.pages?.length || '?';
      return buildResult({
        kind: 'pdf',
        summary: `${pageCount} pages`,
        text: result.text || '',
      });
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy().catch(() => {});
      }
    }
  }

  const parsePdf = pdfModule.default ?? pdfModule;
  const result = await parsePdf(buffer);

  return buildResult({
    kind: 'pdf',
    summary: `${result.numpages || '?'} pages`,
    text: result.text || '',
  });
}

async function extractDocx(buffer) {
  const mammoth =
    (mammothModule ?? (mammothModule = await import('mammoth'))).default ?? mammothModule;
  const result = await mammoth.extractRawText({ buffer });
  const paragraphCount = result.value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean).length;

  return buildResult({
    kind: 'docx',
    summary: `${paragraphCount || countLines(result.value)} paragraphs`,
    text: result.value || '',
    warnings: (result.messages ?? []).map((message) => message.message || String(message)),
  });
}

function serializeWorksheetRow(row) {
  const cells = [];

  for (let column = 1; column <= row.cellCount; column += 1) {
    cells.push(row.getCell(column).toCsvString());
  }

  while (cells.length && !cells.at(-1)) {
    cells.pop();
  }

  return cells.join(',');
}

async function extractSpreadsheet(buffer) {
  const ExcelJS =
    (excelJsModule ?? (excelJsModule = await import('exceljs'))).default ?? excelJsModule;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sections = [];

  for (const worksheet of workbook.worksheets.slice(0, 6)) {
    const previewRows = [];
    let rowCount = 0;

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const csvLine = serializeWorksheetRow(row);

      if (!csvLine.trim()) {
        return;
      }

      rowCount += 1;

      if (previewRows.length < 40) {
        previewRows.push(csvLine);
      }
    });

    if (rowCount === 0) {
      continue;
    }

    const hiddenRows = rowCount > 40 ? `\n[${rowCount - 40} more rows omitted]` : '';
    sections.push(`## Sheet: ${worksheet.name}\n${previewRows.join('\n')}${hiddenRows}`);
  }

  return buildResult({
    kind: 'spreadsheet',
    summary: `${workbook.worksheets.length} sheet${workbook.worksheets.length === 1 ? '' : 's'}`,
    text: sections.join('\n\n'),
  });
}

function naturalSlideSort(left, right) {
  const leftIndex = Number.parseInt(left.match(/slide(\d+)\.xml$/i)?.[1] ?? '0', 10);
  const rightIndex = Number.parseInt(right.match(/slide(\d+)\.xml$/i)?.[1] ?? '0', 10);
  return leftIndex - rightIndex;
}

async function extractPptx(buffer) {
  const JSZip = (jsZipModule ?? (jsZipModule = await import('jszip'))).default ?? jsZipModule;
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort(naturalSlideSort)
    .slice(0, 40);
  const slides = [];

  for (let index = 0; index < slideNames.length; index += 1) {
    const xml = await zip.file(slideNames[index])?.async('string');

    if (!xml) {
      continue;
    }

    const chunks = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
      .map((match) => decodeXmlEntities(match[1]))
      .map((text) => text.trim())
      .filter(Boolean);

    if (chunks.length > 0) {
      slides.push(`## Slide ${index + 1}\n${chunks.join('\n')}`);
    }
  }

  return buildResult({
    kind: 'pptx',
    summary: `${slideNames.length} slide${slideNames.length === 1 ? '' : 's'}`,
    text: slides.join('\n\n'),
  });
}

async function extractAttachmentText(fileName, buffer) {
  const ext = getExtension(fileName);

  if (TEXT_EXTENSIONS.has(ext)) return extractTextBuffer(fileName, buffer);
  if (ext === 'pdf') return extractPdf(buffer);
  if (ext === 'docx') return extractDocx(buffer);
  if (ext === 'xlsx' || ext === 'xlsm') return extractSpreadsheet(buffer);
  if (ext === 'pptx') return extractPptx(buffer);

  throw new Error(`Unsupported file type: ${ext || 'unknown'}.`);
}

function resolveLimit(fileName) {
  const ext = getExtension(fileName);
  return EXTRACTABLE_EXTENSIONS.has(ext) ? EXTRACTABLE_MAX_BYTES : DIRECT_TEXT_MAX_BYTES;
}

function isSupportedAttachment(fileName, allowImages = false) {
  const ext = getExtension(fileName);
  return (
    TEXT_EXTENSIONS.has(ext) ||
    EXTRACTABLE_EXTENSIONS.has(ext) ||
    (allowImages && IMAGE_EXTENSIONS.has(ext))
  );
}

export function getSupportedAttachmentExtensions() {
  return [...TEXT_EXTENSIONS, ...EXTRACTABLE_EXTENSIONS].sort();
}

export function getImageAttachmentExtensions() {
  return [...IMAGE_EXTENSIONS];
}

export async function readAttachmentFiles(filePaths = [], { allowImages = false } = {}) {
  const attachments = [];
  const rejected = [];
  const selectedPaths = Array.isArray(filePaths) ? filePaths : [];

  for (const filePath of selectedPaths.slice(0, MAX_FILES)) {
    const fileName = path.basename(filePath);
    const ext = getExtension(fileName);

    if (!isSupportedAttachment(fileName, allowImages)) {
      rejected.push({ fileName, reason: 'unsupported' });
      continue;
    }

    let fileHandle = null;

    try {
      fileHandle = await open(filePath, 'r');
    } catch {
      rejected.push({ fileName, reason: 'unreadable' });
      continue;
    }

    try {
      const fileStats = await fileHandle.stat();

      if (!fileStats.isFile()) {
        rejected.push({ fileName, reason: 'not-file' });
        continue;
      }

      // ── Image files ──────────────────────────────────────────────────────
      if (allowImages && IMAGE_EXTENSIONS.has(ext)) {
        if (fileStats.size > IMAGE_MAX_BYTES) {
          rejected.push({
            fileName,
            reason: 'too-large',
            limitBytes: IMAGE_MAX_BYTES,
            sizeBytes: fileStats.size,
          });
          continue;
        }

        try {
          const buffer = await fileHandle.readFile();
          const mimeType = IMAGE_MIME_TYPES[ext] ?? 'image/jpeg';
          attachments.push({
            id: randomUUID(),
            type: 'file',
            kind: 'image',
            name: fileName,
            path: filePath,
            size: fileStats.size,
            mimeType,
            base64: buffer.toString('base64'),
            summary: 'Image',
            text: null,
            lines: 0,
            truncated: false,
            warnings: [],
          });
        } catch (error) {
          rejected.push({
            fileName,
            reason: 'extract-failed',
            message: error?.message ?? String(error),
          });
        }

        continue;
      }

      const limit = resolveLimit(fileName);

      if (fileStats.size > limit) {
        rejected.push({
          fileName,
          reason: 'too-large',
          limitBytes: limit,
          sizeBytes: fileStats.size,
        });
        continue;
      }

      try {
        const buffer = await fileHandle.readFile();
        const extracted = await extractAttachmentText(fileName, buffer);

        attachments.push({
          id: randomUUID(),
          type: 'file',
          name: fileName,
          path: filePath,
          size: fileStats.size,
          summary: extracted.summary,
          text: extracted.text,
          lines: extracted.lines,
          kind: extracted.kind,
          truncated: extracted.truncated,
          warnings: extracted.warnings,
        });
      } catch (error) {
        rejected.push({
          fileName,
          reason: 'extract-failed',
          message: error?.message ?? String(error),
        });
      }
    } finally {
      await fileHandle.close();
    }
  }

  if (selectedPaths.length > MAX_FILES) {
    rejected.push({ fileName: `${selectedPaths.length - MAX_FILES} more`, reason: 'too-many' });
  }

  return { attachments, rejected };
}
