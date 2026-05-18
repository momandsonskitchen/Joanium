/**
 * Shared/Markdown/MarkdownRenderer.js
 *
 * Lightweight, dependency-free Markdown → DOM renderer for Joanium.
 *
 * Supported syntax:
 *   Blocks  : headings (h1–h6), paragraphs, fenced code blocks,
 *             blockquotes, unordered lists, ordered lists, horizontal rules.
 *   Inlines : **bold**, *italic*, `code`, [label](url).
 *
 * Usage:
 *   import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
 *   const el = renderMarkdown(markdownString);
 *   container.append(el);
 */

import strings from '../I18n/en.js';

const codeBlockStrings = strings.markdown.codeBlock;

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttributeFromEscapedText(value) {
  return String(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeEscapedMarkdownUrl(url) {
  const candidate = String(url ?? '').trim();
  if (!/^(https?:|mailto:)/i.test(candidate)) return '#';
  return escapeAttributeFromEscapedText(candidate);
}

// ---------------------------------------------------------------------------
// Inline renderer
// ---------------------------------------------------------------------------

/**
 * Converts inline Markdown syntax within a single text string to HTML.
 * HTML-escapes the source first so no raw markup leaks through.
 *
 * @param {string} text
 * @returns {string} HTML string (safe for innerHTML assignment)
 */
export function renderInline(text) {
  const inlineCodeTokens = [];

  // 1. Escape HTML special chars
  let out = escapeHtml(text);

  // 2. Inline code  `code`  — must run before bold/italic so backticks win
  out = out.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@JOANIUMINLINECODE${inlineCodeTokens.length}@@`;
    inlineCodeTokens.push(`<code class="md-code-inline">${code}</code>`);
    return token;
  });

  // 3. Bold  **text** or __text__
  out = out.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`);

  // 4. Italic  *text* or _text_  (single star/underscore, not already consumed)
  out = out.replace(/\*([^*]+)\*|_([^_]+)_/g, (_, a, b) => `<em>${a ?? b}</em>`);

  // 5. Links  [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safe = sanitizeEscapedMarkdownUrl(url);
    return `<a class="md-link" href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  out = inlineCodeTokens.reduce((next, html, index) => {
    return next.replace(`@@JOANIUMINLINECODE${index}@@`, html);
  }, out);

  return out;
}

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

/**
 * Splits a GFM table row string into trimmed cell strings.
 * Handles leading/trailing pipes: | a | b | → ['a', 'b']
 */
function parseTableRow(line) {
  return line
    .replace(/^\|?|\|?\s*$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * Reads column alignments from a GFM separator row (e.g. |:---|:---:|---:|).
 * Returns an array of 'left' | 'center' | 'right' per column.
 */
function parseTableAlignments(line) {
  return parseTableRow(line).map((cell) => {
    const c = cell.trim();
    if (c.startsWith(':') && c.endsWith(':')) return 'center';
    if (c.endsWith(':')) return 'right';
    return 'left';
  });
}

// ---------------------------------------------------------------------------
// Block parser — produces an AST-like array of block objects
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Block
 * @property {string} type
 */

/**
 * Parses an array of raw lines into a flat sequence of block descriptors.
 *
 * @param {string[]} lines
 * @returns {Block[]}
 */
function parseBlocks(lines) {
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Blank line ──────────────────────────────────────────────────────
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── Fenced code block  ```lang ──────────────────────────────────────
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      blocks.push({ type: 'codeblock', lang, code: codeLines.join('\n') });
      continue;
    }

    // ── Horizontal rule  --- / *** / ___ ───────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // ── Heading  # … ###### ────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // ── Blockquote  > … ────────────────────────────────────────────────
    if (/^>\s?/.test(line)) {
      const qLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: qLines });
      continue;
    }

    // ── Unordered list  - / * / + ──────────────────────────────────────
    if (/^[-*+]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // ── Ordered list  1. … ─────────────────────────────────────────────
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // ── Table  | col | col | separator row ─────────────────────────────
    // A table starts with a pipe-leading line whose NEXT line is a GFM
    // separator (only pipes, dashes, colons, and spaces).
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?[\s|:*-]+\|?\s*$/.test(lines[i + 1])) {
      const headers = parseTableRow(line);
      i++; // consume separator
      const alignments = parseTableAlignments(lines[i]);
      i++;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i]) && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, alignments, rows });
      continue;
    }

    // ── Paragraph ──────────────────────────────────────────────────────
    // Collect consecutive non-blank lines that aren't block-level openers.
    const paraLines = [];
    const blockOpener = /^(#{1,6}\s|```|>\s?|[-*+]\s|\d+\.\s|(-{3,}|\*{3,}|_{3,})\s*$)/;
    while (i < lines.length && lines[i].trim() !== '' && !blockOpener.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      // Join soft-wrapped lines into a single paragraph string
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
    }
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// DOM builder — turns block descriptors into real DOM nodes
// ---------------------------------------------------------------------------

/**
 * Recursively builds DOM nodes from a block array.
 * Returns a DocumentFragment ready to be appended.
 *
 * @param {Block[]} blocks
 * @returns {DocumentFragment}
 */
function buildDom(blocks) {
  const frag = document.createDocumentFragment();

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const el = document.createElement(`h${block.level}`);
        el.className = `md-h md-h${block.level}`;
        el.innerHTML = renderInline(block.text);
        frag.append(el);
        break;
      }

      case 'paragraph': {
        const el = document.createElement('p');
        el.className = 'md-p';
        el.innerHTML = renderInline(block.text);
        frag.append(el);
        break;
      }

      case 'codeblock': {
        const wrap = document.createElement('div');
        wrap.className = 'md-codeblock';

        // ── Header bar ────────────────────────────────────────────────
        const header = document.createElement('div');
        header.className = 'md-codeblock__header';

        const langLabel = document.createElement('span');
        langLabel.className = 'md-codeblock__lang';
        langLabel.textContent = block.lang || 'text';
        header.append(langLabel);

        const actions = document.createElement('div');
        actions.className = 'md-codeblock__actions';

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'md-codeblock__btn';
        copyBtn.type = 'button';
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span></span>`;
        const copyLabel = copyBtn.querySelector('span');
        copyLabel.textContent = codeBlockStrings.copy;
        copyBtn.addEventListener('click', () => {
          navigator.clipboard
            .writeText(block.code)
            .then(() => {
              copyLabel.textContent = codeBlockStrings.copied;
              copyBtn.classList.add('md-codeblock__btn--success');
              setTimeout(() => {
                copyLabel.textContent = codeBlockStrings.copy;
                copyBtn.classList.remove('md-codeblock__btn--success');
              }, 1800);
            })
            .catch(() => {});
        });

        // Download button
        const dlBtn = document.createElement('button');
        dlBtn.className = 'md-codeblock__btn';
        dlBtn.type = 'button';
        const extMap = {
          js: 'js',
          javascript: 'js',
          ts: 'ts',
          typescript: 'ts',
          py: 'py',
          python: 'py',
          css: 'css',
          html: 'html',
          json: 'json',
          sh: 'sh',
          bash: 'sh',
          cpp: 'cpp',
          c: 'c',
          java: 'java',
          rs: 'rs',
          rust: 'rs',
          go: 'go',
          sql: 'sql',
          md: 'md',
          yaml: 'yaml',
          yml: 'yml',
          xml: 'xml',
        };
        const ext = extMap[block.lang?.toLowerCase()] ?? 'txt';
        dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span></span>`;
        dlBtn.querySelector('span').textContent = codeBlockStrings.download;
        dlBtn.addEventListener('click', () => {
          const blob = new Blob([block.code], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `snippet.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
        });

        actions.append(copyBtn, dlBtn);
        header.append(actions);
        wrap.append(header);

        // ── Code area ──────────────────────────────────────────────────
        const pre = document.createElement('pre');
        pre.className = 'md-pre';
        const code = document.createElement('code');
        code.className = `md-code${block.lang ? ` language-${block.lang}` : ''}`;
        code.textContent = block.code;
        pre.append(code);
        wrap.append(pre);

        frag.append(wrap);
        break;
      }

      case 'blockquote': {
        const bq = document.createElement('blockquote');
        bq.className = 'md-blockquote';
        const inner = buildDom(parseBlocks(block.lines));
        bq.append(inner);
        frag.append(bq);
        break;
      }

      case 'ul': {
        const ul = document.createElement('ul');
        ul.className = 'md-ul';
        for (const item of block.items) {
          const li = document.createElement('li');
          li.className = 'md-li';
          li.innerHTML = renderInline(item);
          ul.append(li);
        }
        frag.append(ul);
        break;
      }

      case 'ol': {
        const ol = document.createElement('ol');
        ol.className = 'md-ol';
        for (const item of block.items) {
          const li = document.createElement('li');
          li.className = 'md-li';
          li.innerHTML = renderInline(item);
          ol.append(li);
        }
        frag.append(ol);
        break;
      }

      case 'table': {
        const tableWrap = document.createElement('div');
        tableWrap.className = 'md-table-wrap';
        const table = document.createElement('table');
        table.className = 'md-table';

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        for (let ci = 0; ci < block.headers.length; ci++) {
          const th = document.createElement('th');
          th.className = 'md-th';
          th.style.textAlign = block.alignments[ci] ?? 'left';
          th.innerHTML = renderInline(block.headers[ci]);
          headerRow.append(th);
        }
        thead.append(headerRow);
        table.append(thead);

        // Body
        if (block.rows.length > 0) {
          const tbody = document.createElement('tbody');
          for (const row of block.rows) {
            const tr = document.createElement('tr');
            for (let ci = 0; ci < block.headers.length; ci++) {
              const td = document.createElement('td');
              td.className = 'md-td';
              td.style.textAlign = block.alignments[ci] ?? 'left';
              td.innerHTML = renderInline(row[ci] ?? '');
              tr.append(td);
            }
            tbody.append(tr);
          }
          table.append(tbody);
        }

        tableWrap.append(table);
        frag.append(tableWrap);
        break;
      }

      case 'hr': {
        const hr = document.createElement('hr');
        hr.className = 'md-hr';
        frag.append(hr);
        break;
      }

      default:
        break;
    }
  }

  return frag;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders a Markdown string into a `<div class="md-root">` element.
 *
 * @param {string} markdown   Raw Markdown text.
 * @param {string} [extra]    Optional extra class(es) appended to the root div.
 * @returns {HTMLDivElement}  Ready-to-append DOM element.
 */
export function renderMarkdown(markdown, extra = '') {
  const lines = (markdown ?? '').split(/\r?\n/);
  const blocks = parseBlocks(lines);
  const dom = buildDom(blocks);

  const root = document.createElement('div');
  root.className = ['md-root', extra].filter(Boolean).join(' ');
  root.append(dom);
  return root;
}
