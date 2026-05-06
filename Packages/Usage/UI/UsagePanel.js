import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Returns an array of the last `days` YYYY-MM-DD keys (oldest → newest)
function buildDateRange(days) {
  const result = [];
  const today  = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
    result.push(key);
  }
  return result;
}

// Returns a 0-4 intensity bucket for a value against a max.
function intensityLevel(value, max) {
  if (!value || !max) return 0;
  const ratio = value / max;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.45) return 3;
  if (ratio >= 0.20) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Heatmap — GitHub contribution-style grid
// Columns = weeks (oldest left → newest right)
// Rows    = days of the week (Mon row 0 at the top)
// ---------------------------------------------------------------------------

function buildHeatmap(strings, daily, dateKeys) {
  const heatmapRoot = createElement('div', 'usage-heatmap');
  const heading     = createElement('h3', 'usage-section-heading', strings.heatmap.heading);

  // ── Token counts per day ──
  const dayTotals = {};
  for (const key of dateKeys) {
    const entry = daily[key];
    dayTotals[key] = entry ? (entry.tokensIn + entry.tokensOut) : 0;
  }
  const maxTokens = Math.max(1, ...Object.values(dayTotals));

  // ── Build week columns ──
  // Pad the start so the first cell sits in the correct weekday row.
  // weekday: 0=Sun…6=Sat. We display Mon–Sun (Mon=row 0).
  const firstDate = (() => {
    const [y, m, d] = dateKeys[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  })();
  // Number of empty slots to pad at the top of column 0
  const startPad = (firstDate.getDay() + 6) % 7; // Mon-based: Mon=0, Sun=6

  const allCells = [];
  for (let i = 0; i < startPad; i++) allCells.push(null); // padding
  for (const key of dateKeys) allCells.push(key);

  // Slice into week columns
  const weeks = [];
  for (let i = 0; i < allCells.length; i += 7) {
    weeks.push(allCells.slice(i, i + 7));
  }

  // ── Month label row ──
  const monthRow = createElement('div', 'usage-heatmap__months');
  let lastMonth  = -1;
  for (const week of weeks) {
    const firstKey = week.find(Boolean);
    const monthEl  = createElement('span', 'usage-heatmap__month-label');
    if (firstKey) {
      const [, m, d] = firstKey.split('-').map(Number);
      if (m !== lastMonth && d <= 7) {
        monthEl.textContent = new Date(0, m - 1).toLocaleString('en-US', { month: 'short' });
        lastMonth = m;
      }
    }
    monthRow.append(monthEl);
  }

  // ── Day labels (left column) ──
  const dayLabels = createElement('div', 'usage-heatmap__day-labels');
  const days      = strings.heatmap.dayLabels; // ['Sun','Mon'…'Sat']
  // Mon-first order: Mon Tue Wed Thu Fri Sat Sun
  const orderedDays = [days[1], days[2], days[3], days[4], days[5], days[6], days[0]];
  for (let i = 0; i < 7; i++) {
    const label = createElement('span', 'usage-heatmap__day-label');
    // only render Mon / Wed / Fri / Sun to keep it sparse
    if ([0, 2, 4, 6].includes(i)) label.textContent = orderedDays[i];
    dayLabels.append(label);
  }

  // ── Grid ──
  const grid = createElement('div', 'usage-heatmap__grid');

  for (const week of weeks) {
    const col = createElement('div', 'usage-heatmap__week');
    for (let row = 0; row < 7; row++) {
      const key   = week[row] ?? null;
      const cell  = createElement('div', 'usage-heatmap__cell');
      if (!key) {
        cell.classList.add('usage-heatmap__cell--empty');
      } else {
        const tokens = dayTotals[key] ?? 0;
        const level  = intensityLevel(tokens, maxTokens);
        cell.classList.add(`usage-heatmap__cell--l${level}`);
        // Tooltip via custom attribute-free approach: hover shows a floating bubble
        cell._usageKey    = key;
        cell._usageTokens = tokens;
        cell.addEventListener('mouseenter', (event) => showCellTip(event, strings, key, tokens));
        cell.addEventListener('mouseleave', hideCellTip);
      }
      col.append(cell);
    }
    grid.append(col);
  }

  // ── Legend ──
  const legend     = createElement('div', 'usage-heatmap__legend');
  const lessLabel  = createElement('span', 'usage-heatmap__legend-label', strings.heatmap.less);
  const moreLabel  = createElement('span', 'usage-heatmap__legend-label', strings.heatmap.more);
  const legendCells = createElement('div', 'usage-heatmap__legend-cells');
  for (let l = 0; l <= 4; l++) {
    const c = createElement('div', `usage-heatmap__cell usage-heatmap__cell--l${l}`);
    legendCells.append(c);
  }
  legend.append(lessLabel, legendCells, moreLabel);

  const bodyWrap = createElement('div', 'usage-heatmap__body');
  bodyWrap.append(dayLabels, grid);

  heatmapRoot.append(heading, monthRow, bodyWrap, legend);
  return heatmapRoot;
}

// ── Cell tooltip ──
let tipEl = null;

function showCellTip(event, strings, dateKey, tokens) {
  hideCellTip();
  if (!tokens) return;

  tipEl = createElement('div', 'usage-cell-tip');
  const text = formatText(strings.heatmap.tooltip, {
    tokens: formatNumber(tokens),
    date:   formatDate(dateKey)
  });
  tipEl.textContent = text;
  document.body.append(tipEl);

  const rect = event.target.getBoundingClientRect();
  tipEl.style.left = `${rect.left + rect.width / 2}px`;
  tipEl.style.top  = `${rect.top - 8}px`;
}

function hideCellTip() {
  tipEl?.remove();
  tipEl = null;
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function buildStatCards(strings, data, dateKeys) {
  const grid    = createElement('div', 'usage-stats-grid');
  const dailyIn = dateKeys.map((k) => data.daily[k]?.tokensIn  ?? 0);
  const dailyOut= dateKeys.map((k) => data.daily[k]?.tokensOut ?? 0);
  const dailyMsg= dateKeys.map((k) => data.daily[k]?.messages  ?? 0);

  const rangedIn    = dailyIn.reduce((a, b) => a + b, 0);
  const rangedOut   = dailyOut.reduce((a, b) => a + b, 0);
  const rangedTotal = rangedIn + rangedOut;
  const rangedMsg   = dailyMsg.reduce((a, b) => a + b, 0);

  const activeDays  = dateKeys.filter((k) => (data.daily[k]?.tokensIn ?? 0) + (data.daily[k]?.tokensOut ?? 0) > 0).length;
  const avgPerDay   = activeDays ? Math.round(rangedTotal / activeDays) : 0;

  const peakKey = dateKeys.reduce((best, k) => {
    const v = (data.daily[k]?.tokensIn ?? 0) + (data.daily[k]?.tokensOut ?? 0);
    const b = (data.daily[best]?.tokensIn ?? 0) + (data.daily[best]?.tokensOut ?? 0);
    return v > b ? k : best;
  }, dateKeys[0] ?? '');
  const peakTokens = peakKey ? ((data.daily[peakKey]?.tokensIn ?? 0) + (data.daily[peakKey]?.tokensOut ?? 0)) : 0;

  const cards = [
    { label: strings.stats.totalTokens,   value: formatNumber(rangedTotal),               sub: `${formatNumber(rangedIn)} in · ${formatNumber(rangedOut)} out` },
    { label: strings.stats.totalMessages,  value: formatNumber(rangedMsg),                  sub: `${activeDays} ${strings.stats.activedays}` },
    { label: strings.stats.avgPerDay,      value: formatNumber(avgPerDay),                  sub: strings.stats.totalTokens.toLowerCase() },
    { label: strings.stats.peakDay,        value: peakTokens ? formatNumber(peakTokens) : '—', sub: peakKey ? formatDate(peakKey) : '' }
  ];

  for (const card of cards) {
    const el  = createElement('div', 'usage-stat-card');
    const val = createElement('div', 'usage-stat-card__value', card.value);
    const lbl = createElement('div', 'usage-stat-card__label', card.label);
    const sub = createElement('div', 'usage-stat-card__sub',   card.sub);
    el.append(val, lbl, sub);
    grid.append(el);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Model breakdown table
// ---------------------------------------------------------------------------

function buildModelTable(strings, models) {
  const section  = createElement('div', 'usage-models');
  const heading  = createElement('h3', 'usage-section-heading', strings.models.heading);

  const entries = Object.entries(models).sort((a, b) => {
    const aTotal = a[1].tokensIn + a[1].tokensOut;
    const bTotal = b[1].tokensIn + b[1].tokensOut;
    return bTotal - aTotal;
  });

  if (!entries.length) {
    const empty = createElement('p', 'usage-models__empty', '—');
    section.append(heading, empty);
    return section;
  }

  const maxTotal = Math.max(1, ...entries.map(([, m]) => m.tokensIn + m.tokensOut));
  const allTotal = entries.reduce((s, [, m]) => s + m.tokensIn + m.tokensOut, 0) || 1;

  const table = createElement('div', 'usage-models__table');

  // Header row
  const header = createElement('div', 'usage-models__row usage-models__row--header');
  for (const label of [strings.models.model, strings.models.tokensIn, strings.models.tokensOut, strings.models.messages, strings.models.share]) {
    header.append(createElement('span', 'usage-models__col', label));
  }
  table.append(header);

  for (const [modelId, model] of entries) {
    const total = model.tokensIn + model.tokensOut;
    const share = Math.round((total / allTotal) * 100);
    const bar   = Math.round((total / maxTotal) * 100);

    const row = createElement('div', 'usage-models__row');

    // Model name + provider
    const nameCell   = createElement('div', 'usage-models__col usage-models__col--name');
    const nameLabel  = createElement('div', 'usage-models__model-name', model.label || modelId);
    const provLabel  = createElement('div', 'usage-models__model-provider', model.providerLabel || '');
    const barEl      = createElement('div', 'usage-models__bar-wrap');
    const barFill    = createElement('div', 'usage-models__bar-fill');
    barFill.style.width = `${bar}%`;
    barEl.append(barFill);
    nameCell.append(nameLabel, provLabel, barEl);

    const inCell  = createElement('span', 'usage-models__col usage-models__col--num', formatNumber(model.tokensIn));
    const outCell = createElement('span', 'usage-models__col usage-models__col--num', formatNumber(model.tokensOut));
    const msgCell = createElement('span', 'usage-models__col usage-models__col--num', formatNumber(model.messages));
    const shr     = createElement('span', 'usage-models__col usage-models__col--share');
    const shrPill = createElement('span', 'usage-models__share-pill', `${share}%`);
    shr.append(shrPill);

    row.append(nameCell, inCell, outCell, msgCell, shr);
    table.append(row);
  }

  section.append(heading, table);
  return section;
}

// ---------------------------------------------------------------------------
// Full panel builder
// ---------------------------------------------------------------------------

export function createUsagePanel(strings) {
  const view    = createElement('div', 'usage-view');
  const header  = createElement('div', 'usage-view__header');
  const title   = createElement('h1', 'usage-view__title', strings.title);
  const sub     = createElement('p',  'usage-view__subtitle', strings.subtitle);
  header.append(title, sub);

  // ── Period tabs ──
  const tabBar   = createElement('div', 'usage-tab-bar');
  const periods  = [
    { id: 30,  label: strings.tabs.label30  },
    { id: 90,  label: strings.tabs.label90  },
    { id: 365, label: strings.tabs.label365 }
  ];
  let activePeriod = 30;
  const tabBtns    = new Map();

  for (const period of periods) {
    const btn = createElement('button', 'usage-tab-bar__tab');
    btn.type  = 'button';
    btn.textContent = period.label;
    if (period.id === activePeriod) btn.classList.add('usage-tab-bar__tab--active');
    btn.addEventListener('click', () => {
      if (period.id === activePeriod) return;
      activePeriod = period.id;
      for (const [pid, b] of tabBtns) {
        b.classList.toggle('usage-tab-bar__tab--active', pid === activePeriod);
      }
      void renderContent(activePeriod);
    });
    tabBtns.set(period.id, btn);
    tabBar.append(btn);
  }

  // ── Content area ──
  const content = createElement('div', 'usage-content');
  const scroller = createElement('div', 'usage-content__scroller');
  content.append(scroller);

  const scrollbar = attachCustomScrollbar(content, scroller);

  // ── Render ──
  async function renderContent(days) {
    scroller.replaceChildren(createElement('p', 'usage-loading', strings.loading));

    let data;
    try {
      data = await invokeIpc('usage:get-data');
    } catch {
      scroller.replaceChildren(createElement('p', 'usage-loading', strings.loading));
      return;
    }

    const dateKeys = buildDateRange(days);
    const hasAny   = dateKeys.some((k) => data.daily[k]);

    if (!hasAny && !Object.keys(data.models).length) {
      scroller.replaceChildren(createElement('p', 'usage-empty', strings.empty));
      return;
    }

    const frag = document.createDocumentFragment();
    frag.append(
      buildStatCards(strings, data, dateKeys),
      buildHeatmap(strings, data.daily, dateKeys),
      buildModelTable(strings, data.models)
    );
    scroller.replaceChildren(frag);
  }

  view.append(header, tabBar, content);

  return {
    element: view,
    scrollbarDispose: scrollbar.dispose,
    async onShow() {
      await renderContent(activePeriod);
    }
  };
}
