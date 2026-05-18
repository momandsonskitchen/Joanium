const MAX_DIFF_LINES = 400;
const CONTEXT_LINES = 2;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizePath(value = '') {
  return String(value ?? '').replace(/\\/g, '/');
}

function computeDiff(before, after) {
  const left = before ? before.split('\n') : [];
  const right = after ? after.split('\n') : [];

  if (left.length > MAX_DIFF_LINES || right.length > MAX_DIFF_LINES) {
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    return {
      ops: null,
      added: right.filter((line) => !leftSet.has(line)).length,
      removed: left.filter((line) => !rightSet.has(line)).length,
      tooLarge: true,
    };
  }

  const rows = left.length;
  const cols = right.length;
  const matrix = Array.from({ length: rows + 1 }, () => new Int32Array(cols + 1));

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      matrix[row][col] =
        left[row - 1] === right[col - 1]
          ? matrix[row - 1][col - 1] + 1
          : Math.max(matrix[row - 1][col], matrix[row][col - 1]);
    }
  }

  const ops = [];
  let row = rows;
  let col = cols;

  while (row > 0 || col > 0) {
    if (row > 0 && col > 0 && left[row - 1] === right[col - 1]) {
      ops.push({ type: 'eq', line: left[row - 1] });
      row -= 1;
      col -= 1;
    } else if (col > 0 && (row === 0 || matrix[row][col - 1] >= matrix[row - 1][col])) {
      ops.push({ type: 'add', line: right[col - 1] });
      col -= 1;
    } else {
      ops.push({ type: 'rem', line: left[row - 1] });
      row -= 1;
    }
  }

  ops.reverse();

  return {
    ops,
    added: ops.filter((entry) => entry.type === 'add').length,
    removed: ops.filter((entry) => entry.type === 'rem').length,
    tooLarge: false,
  };
}

function buildDiffHtml(ops) {
  if (!Array.isArray(ops) || ops.length === 0) {
    return '';
  }

  const visible = new Uint8Array(ops.length);
  for (let index = 0; index < ops.length; index += 1) {
    if (ops[index].type === 'eq') {
      continue;
    }

    const start = Math.max(0, index - CONTEXT_LINES);
    const end = Math.min(ops.length - 1, index + CONTEXT_LINES);
    for (let cursor = start; cursor <= end; cursor += 1) {
      visible[cursor] = 1;
    }
  }

  let html = '';
  let lastShownIndex = -2;

  for (let index = 0; index < ops.length; index += 1) {
    if (!visible[index]) {
      continue;
    }

    if (lastShownIndex !== -2 && index > lastShownIndex + 1) {
      const hiddenCount = index - lastShownIndex - 1;
      const label = hiddenCount === 1 ? '1 unchanged line' : `${hiddenCount} unchanged lines`;
      html += `<div class="chat-file-diff__hunk-gap">↕ ${label}</div>`;
    }

    const entry = ops[index];
    const modifier = entry.type === 'add' ? 'add' : entry.type === 'rem' ? 'remove' : 'equal';
    const prefix = entry.type === 'add' ? '+' : entry.type === 'rem' ? '-' : ' ';
    html += `
      <div class="chat-file-diff__line chat-file-diff__line--${modifier}">
        <span class="chat-file-diff__line-prefix">${prefix}</span>
        <span class="chat-file-diff__line-text">${escapeHtml(entry.line || ' ')}</span>
      </div>
    `;
    lastShownIndex = index;
  }

  return html;
}

function buildRelativePath(filePath, workspaceRoot) {
  const normalizedPath = normalizePath(filePath);
  const normalizedRoot = normalizePath(workspaceRoot).replace(/\/+$/, '');

  if (!normalizedRoot) {
    return normalizedPath;
  }

  const lowerPath = normalizedPath.toLowerCase();
  const lowerRoot = normalizedRoot.toLowerCase();
  if (lowerPath === lowerRoot) {
    return normalizedPath.split('/').pop() || normalizedPath;
  }

  if (!lowerPath.startsWith(`${lowerRoot}/`)) {
    return normalizedPath;
  }

  return normalizedPath.slice(normalizedRoot.length + 1);
}

export function createFileDiffTracker({ panel, getWorkspaceRoot = () => '' } = {}) {
  const changes = new Map();
  const renderedPaths = new Set();

  function getWorkspacePath() {
    return String(getWorkspaceRoot?.() ?? '').trim();
  }

  function isEnabled() {
    return Boolean(getWorkspacePath());
  }

  function reset() {
    changes.clear();
    renderedPaths.clear();
    if (panel) {
      panel.hidden = true;
      panel.innerHTML = '';
    }
  }

  function render() {
    if (!panel) {
      return;
    }

    if (!isEnabled() || changes.size === 0) {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }

    const workspaceRoot = getWorkspacePath();
    const cards = Array.from(changes.entries()).map(([filePath, change]) => {
      const relativePath = buildRelativePath(filePath, workspaceRoot);
      const segments = normalizePath(relativePath).split('/');
      const fileName = segments.pop() || relativePath;
      const directory = segments.length ? `${segments.join('/')}/` : '';
      const diffHtml = change.diff.ops
        ? buildDiffHtml(change.diff.ops) ||
          '<div class="chat-file-diff__summary-note">No line changes detected.</div>'
        : '<div class="chat-file-diff__summary-note">Large file: showing change counts only.</div>';
      const isFirstRender = !renderedPaths.has(filePath);
      renderedPaths.add(filePath);

      return `
        <article class="chat-file-diff__card${isFirstRender ? ' chat-file-diff__card--new' : ''}">
          <button
            type="button"
            class="chat-file-diff__card-button"
            aria-expanded="false"
          >
            <span class="chat-file-diff__card-main">
              <span class="chat-file-diff__file-name">${escapeHtml(fileName)}</span>
              ${directory ? `<span class="chat-file-diff__file-dir">${escapeHtml(directory)}</span>` : ''}
            </span>
            <span class="chat-file-diff__stats">
              ${change.isNew ? '<span class="chat-file-diff__tag">new</span>' : ''}
              ${change.diff.added > 0 ? `<span class="chat-file-diff__count chat-file-diff__count--add">+${change.diff.added}</span>` : ''}
              ${change.diff.removed > 0 ? `<span class="chat-file-diff__count chat-file-diff__count--remove">-${change.diff.removed}</span>` : ''}
            </span>
            <span class="chat-file-diff__chevron" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </button>
          <div class="chat-file-diff__diff" hidden>
            ${diffHtml}
          </div>
        </article>
      `;
    });

    panel.hidden = false;
    panel.innerHTML = `
      <div class="chat-file-diff__scroll">
        ${cards.join('')}
      </div>
    `;

    panel.querySelectorAll('.chat-file-diff__card-button').forEach((button) => {
      button.addEventListener('click', () => {
        const diff = button
          .closest('.chat-file-diff__card')
          ?.querySelector('.chat-file-diff__diff');
        if (!diff) {
          return;
        }

        const willOpen = diff.hidden;
        diff.hidden = !willOpen;
        button.setAttribute('aria-expanded', String(willOpen));
        button
          .closest('.chat-file-diff__card')
          ?.classList.toggle('chat-file-diff__card--open', willOpen);
      });
    });
  }

  function recordChange(filePath, beforeContent, afterContent) {
    const normalizedFilePath = String(filePath ?? '').trim();
    if (!normalizedFilePath) {
      return;
    }

    const existing = changes.get(normalizedFilePath);
    const originalBefore = existing ? existing.before : String(beforeContent ?? '');
    const nextAfter = String(afterContent ?? '');

    if (originalBefore === nextAfter) {
      changes.delete(normalizedFilePath);
      renderedPaths.delete(normalizedFilePath);
      render();
      return;
    }

    changes.set(normalizedFilePath, {
      before: originalBefore,
      after: nextAfter,
      isNew: existing?.isNew ?? originalBefore.length === 0,
      diff: computeDiff(originalBefore, nextAfter),
    });
    render();
  }

  function handleFileChanged(event) {
    if (!isEnabled()) {
      return;
    }

    const filePath = String(event?.detail?.filePath ?? '').trim();
    if (!filePath) {
      return;
    }

    recordChange(filePath, event.detail?.before ?? '', event.detail?.after ?? '');
  }

  function init() {
    window.addEventListener('jo:file-changed', handleFileChanged);
    render();
  }

  function destroy() {
    window.removeEventListener('jo:file-changed', handleFileChanged);
    reset();
  }

  return {
    init,
    reset,
    render,
    destroy,
  };
}
