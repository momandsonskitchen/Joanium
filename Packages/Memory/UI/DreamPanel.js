import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

// ── Lightweight line diff (LCS) ──────────────────────────────────────────────

const CONTEXT_LINES = 2;

function computeLineDiff(before, after) {
  const left = (before || '').replace(/\r\n/g, '\n').split('\n');
  const right = (after || '').replace(/\r\n/g, '\n').split('\n');
  const rows = left.length;
  const cols = right.length;
  const matrix = Array.from({ length: rows + 1 }, () => new Int32Array(cols + 1));

  for (let r = 1; r <= rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      matrix[r][c] =
        left[r - 1] === right[c - 1]
          ? matrix[r - 1][c - 1] + 1
          : Math.max(matrix[r - 1][c], matrix[r][c - 1]);
    }
  }

  const ops = [];
  let r = rows;
  let c = cols;
  while (r > 0 || c > 0) {
    if (r > 0 && c > 0 && left[r - 1] === right[c - 1]) {
      ops.push({ type: 'eq', line: left[r - 1] });
      r -= 1;
      c -= 1;
    } else if (c > 0 && (r === 0 || matrix[r][c - 1] >= matrix[r - 1][c])) {
      ops.push({ type: 'add', line: right[c - 1] });
      c -= 1;
    } else {
      ops.push({ type: 'rem', line: left[r - 1] });
      r -= 1;
    }
  }
  ops.reverse();
  return ops;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildDiffHtml(ops) {
  if (!ops || ops.length === 0) return '';

  const visible = new Uint8Array(ops.length);
  for (let i = 0; i < ops.length; i += 1) {
    if (ops[i].type !== 'eq') {
      const start = Math.max(0, i - CONTEXT_LINES);
      const end = Math.min(ops.length - 1, i + CONTEXT_LINES);
      for (let j = start; j <= end; j += 1) visible[j] = 1;
    }
  }

  let html = '';
  let lastShown = -2;
  for (let i = 0; i < ops.length; i += 1) {
    if (!visible[i]) continue;

    if (lastShown !== -2 && i > lastShown + 1) {
      const hidden = i - lastShown - 1;
      const label = hidden === 1 ? '1 unchanged line' : `${hidden} unchanged lines`;
      html += `<div class="dream-diff__gap">\u2195 ${label}</div>`;
    }

    const op = ops[i];
    const cls =
      op.type === 'add'
        ? 'dream-diff__line--add'
        : op.type === 'rem'
          ? 'dream-diff__line--rem'
          : 'dream-diff__line--eq';
    const prefix = op.type === 'add' ? '+' : op.type === 'rem' ? '-' : ' ';
    html +=
      `<div class="dream-diff__line ${cls}">` +
      `<span class="dream-diff__prefix">${prefix}</span>` +
      `<span class="dream-diff__text">${escapeHtml(op.line || ' ')}</span>` +
      '</div>';
    lastShown = i;
  }
  return html;
}

// ── Date formatting ──────────────────────────────────────────────────────────

function formatDreamDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatDreamTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

// ── Panel ────────────────────────────────────────────────────────────────────

export function createDreamPanel(strings) {
  let panel = null;
  let dateListEl = null;
  let detailEl = null;
  let selectedDate = null;

  function getPhaseLabel(type) {
    if (type === 'deduplication') return strings.phaseDedup;
    if (type === 'connections') return strings.phaseConnect;
    return type;
  }

  function renderChangeCard(change) {
    const card = createElement('div', 'dream-phase__change');

    // Header row: filename + summary
    const header = createElement('div', 'dream-phase__change-header');
    const fileName = createElement('span', 'dream-phase__change-file', change.filename);
    header.append(fileName);
    if (change.summary) {
      const summary = createElement('span', 'dream-phase__change-summary', change.summary);
      header.append(summary);
    }
    card.append(header);

    // Diff block (if before/after data exists)
    if (change.before != null && change.after != null) {
      const ops = computeLineDiff(change.before, change.after);
      const added = ops.filter((o) => o.type === 'add').length;
      const removed = ops.filter((o) => o.type === 'rem').length;
      const diffHtml = buildDiffHtml(ops);

      if (diffHtml) {
        const diffWrap = createElement('div', 'dream-diff');

        // Stats line
        const statsEl = createElement('div', 'dream-diff__stats');
        if (added > 0) {
          const addBadge = createElement('span', 'dream-diff__stat--add', `+${added}`);
          statsEl.append(addBadge);
        }
        if (removed > 0) {
          const remBadge = createElement('span', 'dream-diff__stat--rem', `-${removed}`);
          statsEl.append(remBadge);
        }
        diffWrap.append(statsEl);

        // Diff lines
        const diffBody = createElement('div', 'dream-diff__body');
        diffBody.innerHTML = diffHtml;
        diffWrap.append(diffBody);

        card.append(diffWrap);
      }
    }

    return card;
  }

  function renderPhaseCard(phase) {
    const card = createElement('div', 'dream-phase');

    const header = createElement('div', 'dream-phase__header');
    const label = createElement('span', 'dream-phase__label', getPhaseLabel(phase.type));
    const badge = createElement(
      'span',
      `dream-phase__badge dream-phase__badge--${phase.filesChanged > 0 ? 'changed' : 'clean'}`,
      phase.filesChanged > 0
        ? formatText(strings.filesChanged, { count: String(phase.filesChanged) })
        : strings.noChanges,
    );
    header.append(label, badge);

    const meta = createElement(
      'p',
      'dream-phase__meta',
      formatText(strings.filesScanned, { count: String(phase.filesScanned ?? 0) }),
    );

    card.append(header, meta);

    if (phase.error) {
      const errorEl = createElement('p', 'dream-phase__error', phase.error);
      const errorHintEl = createElement('p', 'dream-phase__error-hint', strings.errorHint);
      card.append(errorEl, errorHintEl);
    }

    if (phase.changes && phase.changes.length > 0) {
      const changeList = createElement('div', 'dream-phase__changes');
      for (const change of phase.changes) {
        changeList.append(renderChangeCard(change));
      }
      card.append(changeList);
    }

    return card;
  }

  function renderDreamRuns(runs) {
    if (!detailEl) return;
    detailEl.replaceChildren();

    if (!runs || runs.length === 0) {
      const empty = createElement('div', 'dream-detail__empty');
      empty.append(createElement('p', 'dream-detail__empty-text', strings.empty));
      detailEl.append(empty);
      return;
    }

    for (const run of runs) {
      const runCard = createElement('div', 'dream-run');

      const runHeader = createElement('div', 'dream-run__header');
      const timeLabel = createElement('span', 'dream-run__time', formatDreamTime(run.timestamp));
      const statusBadge = createElement(
        'span',
        `dream-run__status dream-run__status--${run.status ?? 'completed'}`,
        run.status === 'failed' ? strings.statusFailed : strings.statusCompleted,
      );
      runHeader.append(timeLabel, statusBadge);

      runCard.append(runHeader);

      if (Array.isArray(run.phases)) {
        for (const phase of run.phases) {
          runCard.append(renderPhaseCard(phase));
        }
      }

      detailEl.append(runCard);
    }
  }

  async function loadDream(dateStr) {
    selectedDate = dateStr;
    syncDateSelection();
    const runs = await invokeIpc('memory:read-dream', dateStr);
    renderDreamRuns(runs);
  }

  function syncDateSelection() {
    if (!dateListEl) return;
    dateListEl.querySelectorAll('.dream-date-btn').forEach((btn) => {
      btn.classList.toggle('dream-date-btn--active', btn._dreamDate === selectedDate);
    });
  }

  async function populateDateList() {
    if (!dateListEl) return;
    dateListEl.replaceChildren();

    let dates = [];
    try {
      dates = await invokeIpc('memory:list-dreams');
    } catch {
      dates = [];
    }

    if (dates.length === 0) {
      const empty = createElement('div', 'dream-dates__empty');
      empty.append(
        createElement('p', 'dream-dates__empty-title', strings.empty),
        createElement('p', 'dream-dates__empty-hint', strings.emptyHint),
      );
      dateListEl.append(empty);
      if (detailEl) detailEl.replaceChildren();
      return;
    }

    for (const dateStr of dates) {
      const btn = createElement('button', 'dream-date-btn');
      btn.type = 'button';
      btn._dreamDate = dateStr;

      const dot = createElement('span', 'dream-date-btn__dot');
      const label = createElement('span', 'dream-date-btn__label', formatDreamDate(dateStr));
      btn.append(dot, label);
      btn.addEventListener('click', () => {
        void loadDream(dateStr);
      });
      dateListEl.append(btn);
    }

    // Auto-select the newest dream
    void loadDream(dates[0]);
  }

  function build() {
    if (panel) return panel;

    panel = createElement('div', 'dream-panel');
    panel.hidden = true;

    // Header
    const header = createElement('div', 'dream-panel__header');

    const headerCopy = createElement('div', 'dream-panel__header-copy');
    headerCopy.append(
      createElement('h3', 'dream-panel__title', strings.title),
      createElement('p', 'dream-panel__subtitle', strings.subtitle),
    );
    header.append(headerCopy);

    // Body: date list + detail
    const body = createElement('div', 'dream-panel__body');

    const dateColumn = createElement('div', 'dream-panel__date-column');
    dateListEl = createElement('div', 'dream-panel__date-list');
    dateColumn.append(dateListEl);

    const detailColumn = createElement('div', 'dream-panel__detail-column');
    detailEl = createElement('div', 'dream-panel__detail');
    detailColumn.append(detailEl);

    body.append(dateColumn, detailColumn);
    panel.append(header, body);

    return panel;
  }

  return {
    build,
    onShow: () => populateDateList(),
  };
}
