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
function renderInline(text) {
  // 1. Escape HTML special chars
  let out = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Inline code  `code`  — must run before bold/italic so backticks win
  out = out.replace(/`([^`]+)`/g, '<code class="md-code-inline">$1</code>');

  // 3. Bold  **text** or __text__
  out = out.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`);

  // 4. Italic  *text* or _text_  (single star/underscore, not already consumed)
  out = out.replace(/\*([^*]+)\*|_([^_]+)_/g, (_, a, b) => `<em>${a ?? b}</em>`);

  // 5. Links  [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safe = /^(https?:|mailto:)/.test(url) ? url : '#';
    return `<a class="md-link" href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  return out;
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
        text: headingMatch[2].trim()
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

    // ── Paragraph ──────────────────────────────────────────────────────
    // Collect consecutive non-blank lines that aren't block-level openers.
    const paraLines = [];
    const blockOpener = /^(#{1,6}\s|```|>\s?|[-*+]\s|\d+\.\s|(-{3,}|\*{3,}|_{3,})\s*$)/;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !blockOpener.test(lines[i])
    ) {
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
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span>`;
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(block.code).then(() => {
            copyBtn.querySelector('span').textContent = 'Copied!';
            copyBtn.classList.add('md-codeblock__btn--success');
            setTimeout(() => {
              copyBtn.querySelector('span').textContent = 'Copy';
              copyBtn.classList.remove('md-codeblock__btn--success');
            }, 1800);
          }).catch(() => {});
        });

        // Download button
        const dlBtn = document.createElement('button');
        dlBtn.className = 'md-codeblock__btn';
        dlBtn.type = 'button';
        const extMap = { js: 'js', javascript: 'js', ts: 'ts', typescript: 'ts', py: 'py', python: 'py', css: 'css', html: 'html', json: 'json', sh: 'sh', bash: 'sh', cpp: 'cpp', c: 'c', java: 'java', rs: 'rs', rust: 'rs', go: 'go', sql: 'sql', md: 'md', yaml: 'yaml', yml: 'yml', xml: 'xml' };
        const ext = extMap[block.lang?.toLowerCase()] ?? 'txt';
        dlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download</span>`;
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
        const pre  = document.createElement('pre');
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
        const bq     = document.createElement('blockquote');
        bq.className = 'md-blockquote';
        const inner  = buildDom(parseBlocks(block.lines));
        bq.append(inner);
        frag.append(bq);
        break;
      }

      case 'ul': {
        const ul  = document.createElement('ul');
        ul.className = 'md-ul';
        for (const item of block.items) {
          const li  = document.createElement('li');
          li.className = 'md-li';
          li.innerHTML = renderInline(item);
          ul.append(li);
        }
        frag.append(ul);
        break;
      }

      case 'ol': {
        const ol  = document.createElement('ol');
        ol.className = 'md-ol';
        for (const item of block.items) {
          const li  = document.createElement('li');
          li.className = 'md-li';
          li.innerHTML = renderInline(item);
          ol.append(li);
        }
        frag.append(ol);
        break;
      }

      case 'hr': {
        const hr  = document.createElement('hr');
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
  const lines  = (markdown ?? '').split(/\r?\n/);
  const blocks = parseBlocks(lines);
  const dom    = buildDom(blocks);

  const root = document.createElement('div');
  root.className = ['md-root', extra].filter(Boolean).join(' ');
  root.append(dom);
  return root;
}
