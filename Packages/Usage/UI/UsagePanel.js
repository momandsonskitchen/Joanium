import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createDropDownLite } from '../../Shared/DropDownLite/DropDownLite.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';

// ─── Formatting helpers ────────────────────────────────────────────────────

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Date range helpers ────────────────────────────────────────────────────

// All YYYY-MM-DD keys for a given calendar year (Jan 1 → Dec 31)
function buildYearRange(year) {
  const result = [];
  const cur = new Date(year, 0, 1);
  while (cur.getFullYear() === year) {
    result.push(
      [
        cur.getFullYear(),
        String(cur.getMonth() + 1).padStart(2, '0'),
        String(cur.getDate()).padStart(2, '0'),
      ].join('-'),
    );
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// Calendar years present in daily data (oldest → newest), always including current year
function getYearsFromData(daily) {
  const current = new Date().getFullYear();
  let min = current;
  for (const key of Object.keys(daily)) {
    const y = parseInt(key.slice(0, 4), 10);
    if (!isNaN(y) && y >= 2020 && y < min) min = y;
  }
  const years = [];
  for (let y = min; y <= current; y++) years.push(y);
  return years;
}

// ─── Intensity helper ──────────────────────────────────────────────────────

function intensityLevel(value, max) {
  if (!value || !max) return 0;
  const r = value / max;
  if (r >= 0.75) return 4;
  if (r >= 0.45) return 3;
  if (r >= 0.2) return 2;
  return 1;
}

// ─── Stats helpers ─────────────────────────────────────────────────────────

function calcLongestStreak(daily, dateKeys) {
  let longest = 0;
  let cur = 0;
  for (const key of dateKeys) {
    const t = (daily[key]?.tokensIn ?? 0) + (daily[key]?.tokensOut ?? 0);
    if (t > 0) {
      cur++;
      if (cur > longest) longest = cur;
    } else cur = 0;
  }
  return longest;
}

// ─── Tooltip (shared) ──────────────────────────────────────────────────────

let tipEl = null;

function showTip(event, text) {
  hideTip();
  if (!text) return;
  tipEl = createElement('div', 'usage-cell-tip');
  tipEl.textContent = text;
  document.body.append(tipEl);
  const rect = event.target.getBoundingClientRect();
  tipEl.style.left = `${rect.left + rect.width / 2}px`;
  tipEl.style.top = `${rect.top - 8}px`;
}

function hideTip() {
  tipEl?.remove();
  tipEl = null;
}

// ─── Stat cards (8 cards — 4 × 2) ─────────────────────────────────────────

function buildStatCards(strings, data, dateKeys) {
  const daily = data.daily;

  let sumIn = 0,
    sumOut = 0,
    sumMsg = 0,
    activeDays = 0;
  let peakKey = '',
    peakTokens = 0;

  for (const k of dateKeys) {
    const e = daily[k];
    if (!e) continue;
    sumIn += e.tokensIn;
    sumOut += e.tokensOut;
    sumMsg += e.messages;
    const dayTotal = e.tokensIn + e.tokensOut;
    if (dayTotal > 0) activeDays++;
    if (dayTotal > peakTokens) {
      peakTokens = dayTotal;
      peakKey = k;
    }
  }

  const sumTotal = sumIn + sumOut;
  const avgPerDay = activeDays ? Math.round(sumTotal / activeDays) : 0;
  const streak = calcLongestStreak(daily, dateKeys);
  const totalDays = dateKeys.length;

  const cards = [
    {
      value: formatNumber(sumTotal),
      label: strings.stats.totalTokens,
      sub: `${formatNumber(sumIn)} ${strings.stats.in} · ${formatNumber(sumOut)} ${strings.stats.out}`,
      hero: true,
    },
    { value: formatNumber(sumIn), label: strings.stats.tokensIn, sub: strings.stats.inputDesc },
    { value: formatNumber(sumOut), label: strings.stats.tokensOut, sub: strings.stats.outputDesc },
    { value: formatNumber(sumMsg), label: strings.stats.totalMessages, sub: '' },
    {
      value: String(activeDays),
      label: strings.stats.activeDays,
      sub: formatText(strings.stats.activeDaysSub, { total: totalDays }),
    },
    {
      value: formatNumber(avgPerDay),
      label: strings.stats.avgPerDay,
      sub: strings.stats.perActiveDay,
    },
    {
      value: peakTokens ? formatNumber(peakTokens) : '—',
      label: strings.stats.peakDay,
      sub: peakKey ? formatDate(peakKey) : '',
    },
    {
      value: streak ? `${streak}d` : '—',
      label: strings.stats.streak,
      sub: streak ? strings.stats.streakSub : '',
    },
  ];

  const grid = createElement('div', 'usage-stats-grid');
  for (const card of cards) {
    const el = createElement(
      'div',
      card.hero ? 'usage-stat-card usage-stat-card--hero' : 'usage-stat-card',
    );
    const val = createElement('div', 'usage-stat-card__value', card.value);
    const lbl = createElement('div', 'usage-stat-card__label', card.label);
    const sub = createElement('div', 'usage-stat-card__sub', card.sub);
    el.append(val, lbl, sub);
    grid.append(el);
  }

  return grid;
}

// ─── Weekly trend bar chart ────────────────────────────────────────────────

function buildInsights(strings, data, dateKeys) {
  const daily = data.daily;
  const models = data.models;
  const ins = strings.insights;
  const modelEntries = Object.entries(models);
  const cards = [];

  // ── Accumulate year data ──
  let totalIn = 0,
    totalOut = 0,
    totalMsgs = 0,
    activeDays = 0;
  let peakKey = '',
    peakTokens = 0;
  let weekdayTokens = 0,
    weekendTokens = 0,
    weekdayActive = 0,
    weekendActive = 0;

  for (const k of dateKeys) {
    const e = daily[k];
    if (!e) continue;
    totalIn += e.tokensIn;
    totalOut += e.tokensOut;
    totalMsgs += e.messages;
    const t = e.tokensIn + e.tokensOut;
    if (t > 0) activeDays++;
    if (t > peakTokens) {
      peakTokens = t;
      peakKey = k;
    }
    const [y, m, d] = k.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0 || dow === 6) {
      if (t > 0) {
        weekendTokens += t;
        weekendActive++;
      }
    } else {
      if (t > 0) {
        weekdayTokens += t;
        weekdayActive++;
      }
    }
  }

  const totalAll = totalIn + totalOut;

  // 1. Most used model
  if (modelEntries.length) {
    const [id, m] = [...modelEntries].sort(
      (a, b) => b[1].tokensIn + b[1].tokensOut - (a[1].tokensIn + a[1].tokensOut),
    )[0];
    cards.push({
      badge: ins.badges.top,
      label: ins.mostUsedModel,
      bold: m.label || id,
      desc: `${ins.withCalls.replace('{calls}', m.messages)} ${ins.andTokens.replace('{tokens}', formatNumber(m.tokensIn + m.tokensOut))}`,
    });
  }

  // 2. Busiest day
  if (peakKey) {
    const e = daily[peakKey];
    cards.push({
      badge: ins.badges.day,
      label: ins.busiestDay,
      bold: formatDate(peakKey),
      desc: `${ins.withCalls.replace('{calls}', e.messages)} ${ins.andTokens.replace('{tokens}', formatNumber(peakTokens))}`,
    });
  }

  // 3. Token ratio
  if (totalAll > 0) {
    const inPct = Math.round((totalIn / totalAll) * 100);
    const outPct = 100 - inPct;
    const desc =
      inPct >= 70
        ? ins.tokenRatioInputHeavy
        : outPct >= 50
          ? ins.tokenRatioOutputHeavy
          : ins.tokenRatioBalanced;
    cards.push({
      badge: ins.badges.mix,
      label: ins.tokenRatio,
      bold: `${outPct}% ${ins.output}, ${inPct}% ${ins.input}`,
      desc,
    });
  }

  // 4. Avg tokens per call
  if (totalMsgs > 0 && totalAll > 0) {
    const avg = Math.round(totalAll / totalMsgs);
    const verbosity = avg > 8000 ? ins.avgLong : avg > 2000 ? ins.avgMedium : ins.avgShort;
    cards.push({
      badge: ins.badges.avg,
      label: ins.avgTokensPerCall,
      bold: `${formatNumber(avg)} ${ins.tokensOnAverage}`,
      desc: verbosity,
    });
  }

  // 5. Multi-provider
  const providers = [
    ...new Set(
      Object.values(models)
        .map((m) => m.providerLabel)
        .filter(Boolean),
    ),
  ];
  if (providers.length > 1) {
    cards.push({
      badge: ins.badges.net,
      label: ins.multiProvider,
      bold: ins.usingProviders.replace('{count}', providers.length),
      desc: providers.join(', '),
    });
  } else if (providers.length === 1) {
    cards.push({
      badge: ins.badges.net,
      label: ins.multiProvider,
      bold: providers[0],
      desc: ins.singleProvider,
    });
  }

  // 6. Weekend vs Weekday
  if (weekdayActive > 0 && weekendActive > 0) {
    const wdAvg = Math.round(weekdayTokens / weekdayActive);
    const weAvg = Math.round(weekendTokens / weekendActive);
    const ratio = (Math.max(wdAvg, weAvg) / Math.max(1, Math.min(wdAvg, weAvg))).toFixed(1);
    const more = weAvg > wdAvg ? ins.weekends : ins.weekdays;
    cards.push({
      badge: ins.badges.week,
      label: ins.weekendVsWeekday,
      bold: ins.xMoreOn.replace('{ratio}', ratio).replace('{more}', more),
      desc: ins.onActiveDays,
    });
  }

  // 7. Top provider
  const provTotals = {};
  const provMsgs = {};
  for (const [, m] of modelEntries) {
    if (!m.providerLabel) continue;
    provTotals[m.providerLabel] = (provTotals[m.providerLabel] ?? 0) + m.tokensIn + m.tokensOut;
    provMsgs[m.providerLabel] = (provMsgs[m.providerLabel] ?? 0) + m.messages;
  }
  const topProvEntry = Object.entries(provTotals).sort((a, b) => b[1] - a[1])[0];
  if (topProvEntry && totalAll > 0) {
    const [prov, toks] = topProvEntry;
    const share = Math.round((toks / totalAll) * 100);
    cards.push({
      badge: ins.badges.prov,
      label: ins.topProvider,
      bold: `${prov} ${ins.accountsFor.replace('{share}', share)}`,
      desc: ins.acrossMessages.replace('{calls}', provMsgs[prov] ?? 0),
    });
  }

  // 8. Response verbosity
  const outTotal = Object.values(models).reduce((s, m) => s + m.tokensOut, 0);
  const msgTotal = Object.values(models).reduce((s, m) => s + m.messages, 0);
  if (msgTotal > 0 && outTotal > 0) {
    const avgOut = Math.round(outTotal / msgTotal);
    const style =
      avgOut < 100 ? ins.verbosityLow : avgOut < 500 ? ins.verbosityMedium : ins.verbosityHigh;
    const mostVerbose = [...modelEntries]
      .filter(([, m]) => m.messages > 0)
      .sort((a, b) => b[1].tokensOut / b[1].messages - a[1].tokensOut / a[1].messages)[0];
    const verbSuffix = mostVerbose
      ? ` ${ins.mostVerboseModel.replace('{model}', mostVerbose[1].label || mostVerbose[0])}`
      : '';
    cards.push({
      badge: ins.badges.out,
      label: ins.responseVerbosity,
      bold: ins.avgOutputTokens.replace('{avg}', avgOut),
      desc: `${style}${verbSuffix}`,
    });
  }

  // 9. Most active month
  // (defined below after new cards)

  // 10. Usage intensity (messages per active day)
  if (activeDays > 0 && totalMsgs > 0) {
    const msgsPerDay = (totalMsgs / activeDays).toFixed(1);
    const intensity =
      msgsPerDay >= 20
        ? ins.intensityHigh
        : msgsPerDay >= 8
          ? ins.intensityMedium
          : ins.intensityLow;
    cards.push({
      badge: ins.badges.rpd,
      label: ins.usageIntensity,
      bold: ins.msgsPerDay.replace('{msgs}', msgsPerDay),
      desc: intensity,
    });
  }

  // 11. Model diversity
  if (modelEntries.length > 0) {
    const desc =
      modelEntries.length === 1
        ? ins.modelDiversitySingle
        : ins.modelDiversityMulti.replace('{count}', modelEntries.length);
    const topTwo = modelEntries
      .sort((a, b) => b[1].tokensIn + b[1].tokensOut - (a[1].tokensIn + a[1].tokensOut))
      .slice(0, 2)
      .map(([id, m]) => m.label || id)
      .join(ins.andJoiner);
    cards.push({
      badge: ins.badges.mdv,
      label: ins.modelDiversity,
      bold: topTwo,
      desc,
    });
  }

  // 12. Growth trend (last 30 days vs prior 30 days)
  {
    const today = dateKeys[dateKeys.length - 1];
    const todayIdx = dateKeys.indexOf(today);
    const last30 = dateKeys.slice(Math.max(0, todayIdx - 29), todayIdx + 1);
    const prior30 = dateKeys.slice(Math.max(0, todayIdx - 59), todayIdx - 29);
    const sumRange = (keys) =>
      keys.reduce((s, k) => {
        const e = daily[k];
        return s + (e ? e.tokensIn + e.tokensOut : 0);
      }, 0);
    const t1 = sumRange(prior30);
    const t2 = sumRange(last30);
    if (t2 > 0) {
      const trend =
        t1 === 0
          ? ins.trendNew
          : t2 > t1 * 1.1
            ? ins.trendGrowing.replace('{ratio}', (t2 / t1).toFixed(1))
            : t1 > t2 * 1.1
              ? ins.trendDeclining.replace('{ratio}', (t1 / t2).toFixed(1))
              : ins.trendSteady;
      cards.push({
        badge: ins.badges.trd,
        label: ins.growthTrend,
        bold: trend,
        desc: ins.trendWindow,
      });
    }
  }

  // (original 9 — moved here)
  const monthTotals = {};
  for (const k of dateKeys) {
    const e = daily[k];
    if (!e) continue;
    const month = k.slice(0, 7); // YYYY-MM
    monthTotals[month] = (monthTotals[month] ?? 0) + e.tokensIn + e.tokensOut;
  }
  const peakMonthEntry = Object.entries(monthTotals).sort((a, b) => b[1] - a[1])[0];
  if (peakMonthEntry && totalAll > 0) {
    const [monthKey, monthTokens] = peakMonthEntry;
    const [pmy, pmm] = monthKey.split('-').map(Number);
    const monthName = new Date(pmy, pmm - 1).toLocaleString('en-US', { month: 'long' });
    const share = Math.round((monthTokens / totalAll) * 100);
    cards.push({
      badge: ins.badges.mon,
      label: ins.mostActiveMonth,
      bold: ins.peakMonthTokens
        .replace('{tokens}', formatNumber(monthTokens))
        .replace('{month}', monthName),
      desc: ins.peakMonthShare.replace('{share}', share),
    });
  }

  if (!cards.length) return null;

  const section = createElement('div', 'usage-insights');
  const headRow = createElement('div', 'usage-insights__head');
  headRow.append(
    createElement('h3', 'usage-section-heading', ins.heading),
    createElement('span', 'usage-insights__auto-label', ins.autoGenerated),
  );

  const grid = createElement('div', 'usage-insights__grid');

  for (const card of cards) {
    const el = createElement('div', 'usage-insight-card');
    const bdg = createElement('span', 'usage-insight-card__badge', card.badge);
    const lbl = createElement('div', 'usage-insight-card__label', card.label);
    const body = createElement('div', 'usage-insight-card__body');
    const bold = createElement('strong', 'usage-insight-card__bold', card.bold);
    body.append(bold, document.createTextNode(` ${card.desc}`));
    el.append(bdg, lbl, body);
    grid.append(el);
  }

  section.append(headRow, grid);
  return section;
}

// ─── Heatmap (full-year, GitHub-style grid) ────────────────────────────────

function buildHeatmap(strings, daily, dateKeys) {
  const root = createElement('div', 'usage-heatmap');
  const heading = createElement('h3', 'usage-section-heading', strings.heatmap.heading);

  const dayTotals = {};
  for (const key of dateKeys) {
    const e = daily[key];
    dayTotals[key] = e ? e.tokensIn + e.tokensOut : 0;
  }
  const maxTokens = Math.max(1, ...Object.values(dayTotals));

  // Pad start so the first cell sits in the correct weekday row (Mon = row 0)
  const [fy, fm, fd] = dateKeys[0].split('-').map(Number);
  const startPad = (new Date(fy, fm - 1, fd).getDay() + 6) % 7;

  const allCells = [...Array(startPad).fill(null), ...dateKeys];
  const weeks = [];
  for (let i = 0; i < allCells.length; i += 7) weeks.push(allCells.slice(i, i + 7));

  // Month label row (above the grid)
  const monthRow = createElement('div', 'usage-heatmap__months');
  let lastMonthHM = -1;
  for (const week of weeks) {
    const firstKey = week.find(Boolean);
    const el = createElement('span', 'usage-heatmap__month-label');
    if (firstKey) {
      const [, m, d] = firstKey.split('-').map(Number);
      if (m !== lastMonthHM && d <= 7) {
        el.textContent = new Date(0, m - 1).toLocaleString('en-US', { month: 'short' });
        lastMonthHM = m;
      }
    }
    monthRow.append(el);
  }

  // Day-of-week labels (left side)
  const dayLabelWrap = createElement('div', 'usage-heatmap__day-labels');
  const days = strings.heatmap.dayLabels;
  const ordered = [days[1], days[2], days[3], days[4], days[5], days[6], days[0]];
  for (let i = 0; i < 7; i++) {
    const lbl = createElement('span', 'usage-heatmap__day-label');
    if ([0, 2, 4, 6].includes(i)) lbl.textContent = ordered[i];
    dayLabelWrap.append(lbl);
  }

  // Week columns grid
  const grid = createElement('div', 'usage-heatmap__grid');
  for (const week of weeks) {
    const col = createElement('div', 'usage-heatmap__week');
    for (let row = 0; row < 7; row++) {
      const key = week[row] ?? null;
      const cell = createElement('div', 'usage-heatmap__cell');
      if (!key) {
        cell.classList.add('usage-heatmap__cell--empty');
      } else {
        const tokens = dayTotals[key] ?? 0;
        cell.classList.add(`usage-heatmap__cell--l${intensityLevel(tokens, maxTokens)}`);
        cell.addEventListener('mouseenter', (e) =>
          showTip(
            e,
            tokens
              ? formatText(strings.heatmap.tooltip, {
                  tokens: formatNumber(tokens),
                  date: formatDate(key),
                })
              : null,
          ),
        );
        cell.addEventListener('mouseleave', hideTip);
      }
      col.append(cell);
    }
    grid.append(col);
  }

  // Legend
  const legend = createElement('div', 'usage-heatmap__legend');
  const legendCells = createElement('div', 'usage-heatmap__legend-cells');
  for (let l = 0; l <= 4; l++)
    legendCells.append(createElement('div', `usage-heatmap__cell usage-heatmap__cell--l${l}`));
  legend.append(
    createElement('span', 'usage-heatmap__legend-label', strings.heatmap.less),
    legendCells,
    createElement('span', 'usage-heatmap__legend-label', strings.heatmap.more),
  );

  const bodyWrap = createElement('div', 'usage-heatmap__body');
  bodyWrap.append(dayLabelWrap, grid);
  root.append(heading, monthRow, bodyWrap, legend);
  return root;
}

// ─── Model breakdown table ─────────────────────────────────────────────────

function buildModelTable(strings, models) {
  const section = createElement('div', 'usage-models');
  const heading = createElement('h3', 'usage-section-heading', strings.models.heading);

  const entries = Object.entries(models).sort(
    (a, b) => b[1].tokensIn + b[1].tokensOut - (a[1].tokensIn + a[1].tokensOut),
  );

  if (!entries.length) {
    section.append(heading, createElement('p', 'usage-models__empty', '—'));
    return section;
  }

  const maxTotal = Math.max(1, ...entries.map(([, m]) => m.tokensIn + m.tokensOut));
  const allTotal = entries.reduce((s, [, m]) => s + m.tokensIn + m.tokensOut, 0) || 1;

  const table = createElement('div', 'usage-models__table');
  const header = createElement('div', 'usage-models__row usage-models__row--header');
  for (const label of [
    strings.models.model,
    strings.models.tokensIn,
    strings.models.tokensOut,
    strings.models.messages,
    strings.models.share,
  ]) {
    header.append(createElement('span', 'usage-models__col', label));
  }
  table.append(header);

  for (const [modelId, model] of entries) {
    const total = model.tokensIn + model.tokensOut;
    const share = Math.round((total / allTotal) * 100);
    const barWidth = Math.round((total / maxTotal) * 100);

    const row = createElement('div', 'usage-models__row');
    const nameCell = createElement('div', 'usage-models__col usage-models__col--name');
    const barWrap = createElement('div', 'usage-models__bar-wrap');
    const barFill = createElement('div', 'usage-models__bar-fill');
    barFill.style.width = `${barWidth}%`;
    barWrap.append(barFill);
    nameCell.append(
      createElement('div', 'usage-models__model-name', model.label || modelId),
      createElement('div', 'usage-models__model-provider', model.providerLabel || ''),
      barWrap,
    );

    const shr = createElement('span', 'usage-models__col usage-models__col--share');
    shr.append(createElement('span', 'usage-models__share-pill', `${share}%`));

    row.append(
      nameCell,
      createElement(
        'span',
        'usage-models__col usage-models__col--num',
        formatNumber(model.tokensIn),
      ),
      createElement(
        'span',
        'usage-models__col usage-models__col--num',
        formatNumber(model.tokensOut),
      ),
      createElement(
        'span',
        'usage-models__col usage-models__col--num',
        formatNumber(model.messages),
      ),
      shr,
    );
    table.append(row);
  }

  section.append(heading, table);
  return section;
}

// ─── Panel factory ─────────────────────────────────────────────────────────

export function createUsagePanel(strings) {
  const view = createElement('div', 'usage-view');

  // Header: title + subtitle (left) | year toggle (right)
  const header = createElement('div', 'usage-view__header');

  const headerTop = createElement('div', 'usage-view__header-top');

  const headerText = createPanelHeader({ title: strings.title, subtitle: strings.subtitle });

  const toggleSlot = createElement('div', 'usage-year-toggle-slot');

  headerTop.append(headerText, toggleSlot);
  header.append(headerTop);

  // Scrollable content
  const content = createElement('div', 'usage-content');
  const scroller = createElement('div', 'usage-content__scroller');
  content.append(scroller);

  const scrollbar = attachCustomScrollbar(content, scroller);

  // State
  let activeYear = new Date().getFullYear();
  let cachedData = null;
  let yearDdm = null;

  function renderYear(year, data) {
    activeYear = year;
    const dateKeys = buildYearRange(year);
    const hasAny = dateKeys.some((k) => data.daily[k]);

    if (!hasAny && !Object.keys(data.models).length) {
      scroller.replaceChildren(createElement('p', 'usage-empty', strings.empty));
      return;
    }

    const insightsEl = buildInsights(strings, data, dateKeys);
    const frag = document.createDocumentFragment();
    frag.append(
      buildStatCards(strings, data, dateKeys),
      buildHeatmap(strings, data.daily, dateKeys),
      ...(insightsEl ? [insightsEl] : []),
      buildModelTable(strings, data.models),
    );
    scroller.replaceChildren(frag);
  }

  async function renderContent() {
    scroller.replaceChildren(createElement('p', 'usage-loading', strings.loading));

    let data;
    try {
      data = await invokeIpc('usage:get-data');
    } catch {
      scroller.replaceChildren(createElement('p', 'usage-loading', strings.loading));
      return;
    }
    cachedData = data;

    const years = getYearsFromData(data.daily);
    activeYear = years[years.length - 1]; // default to most recent year with data

    yearDdm?.dispose();
    yearDdm = createDropDownLite({
      options: years.map((y) => ({ value: String(y), label: String(y) })),
      value: String(activeYear),
      onChange: (val) => {
        activeYear = Number(val);
        renderYear(activeYear, cachedData);
      },
    });
    toggleSlot.replaceChildren(yearDdm.element);

    renderYear(activeYear, data);
  }

  view.append(header, content);

  return {
    element: view,
    scrollbarDispose: scrollbar.dispose,
    async onShow() {
      await renderContent();
    },
  };
}
