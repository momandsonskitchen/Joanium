import { createElement, copyToClipboard } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { iconMarkup, createProviderIcon } from '../../Shared/Icons/Icons.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

const API_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedModels = null;
let cacheTimestamp = 0;

let providerIconMap = null;
let providerIconMapPromise = null;

async function loadProviderIconMap() {
  if (providerIconMap) return providerIconMap;
  if (providerIconMapPromise) return providerIconMapPromise;
  providerIconMapPromise = (async () => {
    try {
      const catalog = await invokeIpc('providers:list-catalog');
      const map = new Map();
      for (const p of catalog) {
        if (p.id && p.iconPath) map.set(p.id, p.iconPath);
      }
      providerIconMap = map;
      return map;
    } catch {
      providerIconMap = new Map();
      return providerIconMap;
    }
  })();
  return providerIconMapPromise;
}

function getProviderIconPath(providerId) {
  if (!providerId || !providerIconMap) return null;
  return providerIconMap.get(providerId.toLowerCase()) ?? null;
}

function formatPrice(perToken) {
  if (!perToken || perToken === '0') return 'Free';
  const perMillion = parseFloat(perToken) * 1_000_000;
  if (perMillion < 0.001) return '<$0.001';
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}`;
  if (perMillion < 1) return `$${perMillion.toFixed(2)}`;
  return `$${perMillion.toFixed(2)}`;
}

function formatContext(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function extractProvider(name) {
  const colon = name.indexOf(':');
  if (colon > 0) return name.slice(0, colon).trim();
  const slash = name.indexOf('/');
  if (slash > 0) return name.slice(0, slash).trim();
  return '';
}

function extractDisplayName(name) {
  const colon = name.indexOf(':');
  if (colon > 0) return name.slice(colon + 1).trim();
  return name;
}

const CAPABILITY_LABELS = {
  tools: 'Tools',
  reasoning: 'Reasoning',
  structured_outputs: 'Structured',
  logprobs: 'Logprobs',
  top_logprobs: 'Top Logprobs',
  image: 'Vision',
  audio: 'Audio',
  video: 'Video',
  pdf: 'PDF',
  code_interpreter: 'Code Interpreter',
  web_search: 'Web Search',
  grounding: 'Grounding',
  sampling: 'Sampling',
  response_format: 'Response Format',
};

function processModels(raw) {
  return raw
    .map((m) => {
      const aa = m.benchmarks?.artificial_analysis;
      const arena = m.benchmarks?.design_arena;
      const bestArena =
        arena && arena.length > 0
          ? arena.reduce((a, b) => (b.elo > a.elo ? b : a), arena[0])
          : null;

      const params = m.supported_parameters ?? [];
      const caps = [];
      if (params.includes('tools')) caps.push('tools');
      if (params.includes('reasoning')) caps.push('reasoning');
      if (params.includes('structured_outputs')) caps.push('structured_outputs');
      if (
        m.architecture?.input_modalities?.includes('image') ||
        m.architecture?.modality?.includes('image')
      )
        caps.push('image');
      if (
        m.architecture?.input_modalities?.includes('audio') ||
        m.architecture?.modality?.includes('audio')
      )
        caps.push('audio');
      if (params.includes('web_search')) caps.push('web_search');
      if (params.includes('logprobs')) caps.push('logprobs');

      return {
        id: m.id,
        name: extractDisplayName(m.name),
        provider: extractProvider(m.name),
        description: m.description ?? '',
        contextLength: m.context_length,
        modality: m.architecture?.modality ?? 'text→text',
        inputModalities: m.architecture?.input_modalities ?? ['text'],
        outputModalities: m.architecture?.output_modalities ?? ['text'],
        tokenizer: m.architecture?.tokenizer ?? null,
        instructType: m.architecture?.instruct_type ?? null,
        intelligence: aa?.intelligence_index ?? null,
        coding: aa?.coding_index ?? null,
        agentic: aa?.agentic_index ?? null,
        promptPrice: m.pricing?.prompt ?? '0',
        completionPrice: m.pricing?.completion ?? '0',
        cacheReadPrice: m.pricing?.input_cache_read ?? null,
        cacheWritePrice: m.pricing?.input_cache_write ?? null,
        webSearchPrice: m.pricing?.web_search ?? null,
        imagePrice: m.pricing?.image ?? null,
        audioPrice: m.pricing?.audio ?? null,
        reasoningPrice: m.pricing?.internal_reasoning ?? null,
        maxOutput: m.top_provider?.max_completion_tokens ?? null,
        isModerated: m.top_provider?.is_moderated ?? false,
        caps,
        supportedParams: params,
        arena,
        bestArena,
        knowledgeCutoff: m.knowledge_cutoff ?? null,
        expirationDate: m.expiration_date ?? null,
        created: m.created ?? null,
        huggingFaceId: m.hugging_face_id ?? null,
        isFree: m.pricing?.prompt === '0' && m.pricing?.completion === '0',
        slug: m.id,
      };
    })
    .sort((a, b) => {
      const ai = a.intelligence;
      const bi = b.intelligence;
      if (ai !== null && bi !== null) return bi - ai;
      if (ai !== null) return -1;
      if (bi !== null) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((m, idx) => ({ ...m, rank: idx + 1 }));
}

async function fetchModels() {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels;
  }
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  cachedModels = processModels(json.data ?? []);
  cacheTimestamp = now;
  return cachedModels;
}

export function createLeaderboardPanel(strings) {
  let panel = null;
  let _listEl = null;
  let _search = null;
  let _viewerEl = null;
  let _viewerContentEl = null;
  let allModels = [];
  let activeSort = 'intelligence';
  let sortButtons = null;

  function build() {
    panel = createElement('div', 'chat-leaderboard');
    panel.hidden = true;

    panel.append(createPanelHeader({ title: strings.title, subtitle: strings.subtitle }));

    const body = createElement('div', 'chat-leaderboard__body');

    // ── Left column ────────────────────────────────────────────────────────
    const listCol = createElement('div', 'chat-leaderboard__list-col');
    const listCard = createElement('div', 'chat-leaderboard__list-card');

    const searchWrap = createElement('div', 'chat-leaderboard__list-search');
    _search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(_listEl, value.trim()),
    });
    searchWrap.append(_search.element);

    sortButtons = createElement('div', 'chat-leaderboard__sort');
    const sortKeys = [
      ['intelligence', strings.sort.intelligence],
      ['price', strings.sort.price],
      ['name', strings.sort.name],
    ];
    for (const [key, label] of sortKeys) {
      const btn = createElement('button', 'chat-leaderboard__sort-btn');
      btn.type = 'button';
      btn.textContent = label;
      if (key === activeSort) btn.classList.add('chat-leaderboard__sort-btn--active');
      btn.addEventListener('click', () => {
        activeSort = key;
        sortButtons
          .querySelectorAll('.chat-leaderboard__sort-btn')
          .forEach((b) => b.classList.remove('chat-leaderboard__sort-btn--active'));
        btn.classList.add('chat-leaderboard__sort-btn--active');
        sortAndRender();
      });
      sortButtons.append(btn);
    }

    const countEl = createElement('div', 'chat-leaderboard__count');

    _listEl = createElement('div', 'chat-leaderboard__list-content');
    listCard.append(searchWrap, sortButtons, countEl, _listEl);
    listCol.append(listCard);
    attachCustomScrollbar(listCard, _listEl, { right: 4, top: 4, bottom: 4, minThumb: 24 });

    // ── Right column ───────────────────────────────────────────────────────
    const viewerCol = createElement('div', 'chat-leaderboard__viewer-col');
    _viewerEl = createElement('div', 'chat-leaderboard__viewer-card');

    _viewerContentEl = createElement('div', 'chat-leaderboard__viewer-scroll-content');
    Object.assign(_viewerContentEl.style, {
      flex: 1,
      overflowY: 'auto',
      minHeight: 0,
      padding: '28px 32px',
      display: 'flex',
      flexDirection: 'column',
    });

    _viewerContentEl.append(
      createElement('div', 'chat-leaderboard__viewer-empty', strings.selectPrompt),
    );
    _viewerEl.append(_viewerContentEl);
    viewerCol.append(_viewerEl);
    attachCustomScrollbar(_viewerEl, _viewerContentEl, {
      right: 4,
      top: 4,
      bottom: 4,
      minThumb: 24,
    });

    body.append(listCol, viewerCol);
    panel.append(body);

    panel._listEl = _listEl;
    panel._search = _search;
    panel._viewerEl = _viewerEl;
    panel._countEl = countEl;

    return panel;
  }

  function sortModels(models) {
    const sorted = [...models];
    if (activeSort === 'intelligence') {
      sorted.sort((a, b) => {
        if (a.intelligence !== null && b.intelligence !== null)
          return b.intelligence - a.intelligence;
        if (a.intelligence !== null) return -1;
        if (b.intelligence !== null) return 1;
        return a.name.localeCompare(b.name);
      });
    } else if (activeSort === 'price') {
      sorted.sort((a, b) => {
        const ap = parseFloat(a.promptPrice) || 0;
        const bp = parseFloat(b.promptPrice) || 0;
        return ap - bp;
      });
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }

  function sortAndRender() {
    const q = _search?.getValue()?.trim() ?? '';
    void populateList(_listEl, q);
  }

  async function populateList(listEl, query = '') {
    listEl.replaceChildren();
    for (let i = 0; i < 4; i++) {
      listEl.append(createElement('div', 'chat-leaderboard__skeleton'));
    }

    try {
      await loadProviderIconMap();
      allModels = await fetchModels();
    } catch (err) {
      listEl.replaceChildren();
      const errEl = createElement('div', 'chat-leaderboard__empty');
      errEl.append(
        createElement('p', 'chat-leaderboard__empty-title', 'Failed to load models'),
        createElement('p', 'chat-leaderboard__empty-hint', err.message),
      );
      listEl.append(errEl);
      return;
    }

    const q = collapseWhitespace(query).toLowerCase();
    let filtered = q
      ? allModels.filter(
          (m) =>
            collapseWhitespace(m.name).toLowerCase().includes(q) ||
            collapseWhitespace(m.provider).toLowerCase().includes(q) ||
            collapseWhitespace(m.id).toLowerCase().includes(q),
        )
      : allModels;

    filtered = sortModels(filtered);

    if (panel?._countEl) {
      panel._countEl.textContent = `${filtered.length} model${filtered.length !== 1 ? 's' : ''}`;
    }

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'chat-leaderboard__empty');
      empty.append(
        createElement('p', 'chat-leaderboard__empty-title', q ? strings.noResults : strings.empty),
        createElement('p', 'chat-leaderboard__empty-hint', q ? strings.noResultsHint : ''),
      );
      listEl.append(empty);
      return;
    }

    for (const model of filtered) {
      listEl.append(buildCard(model));
    }
  }

  function buildCard(model) {
    const card = createElement('div', 'chat-leaderboard__card');
    card.addEventListener('click', () => {
      _listEl
        .querySelectorAll('.chat-leaderboard__card--active')
        .forEach((el) => el.classList.remove('chat-leaderboard__card--active'));
      card.classList.add('chat-leaderboard__card--active');
      populateViewer(model);
    });

    // ── Left: rank number (permanent intelligence rank) ────────────────────
    const rankEl = createElement('span', 'chat-leaderboard__card-rank');
    rankEl.textContent = String(model.rank);

    // ── Middle: name + meta ────────────────────────────────────────────────
    const body = createElement('div', 'chat-leaderboard__card-body');
    body.append(createElement('span', 'chat-leaderboard__card-name', model.name));

    const meta = createElement('div', 'chat-leaderboard__card-meta');
    if (model.provider) {
      const providerIcon = getProviderIconPath(model.provider);
      if (providerIcon) {
        meta.append(
          createProviderIcon(providerIcon, {
            className: 'chat-leaderboard__card-provider-icon',
            alt: model.provider,
          }),
        );
      }
      meta.append(createElement('span', 'chat-leaderboard__card-provider', model.provider));
    }
    meta.append(
      createElement('span', 'chat-leaderboard__card-context', formatContext(model.contextLength)),
    );
    const priceText = model.isFree ? 'Free' : formatPrice(model.promptPrice);
    meta.append(createElement('span', 'chat-leaderboard__card-price', priceText));
    body.append(meta);

    // ── Right: intelligence score ──────────────────────────────────────────
    const scoreEl = createElement('span', 'chat-leaderboard__card-score');
    if (model.intelligence !== null) {
      scoreEl.textContent = model.intelligence.toFixed(0);
      if (model.intelligence >= 55) scoreEl.classList.add('chat-leaderboard__card-score--top');
      else if (model.intelligence >= 40) scoreEl.classList.add('chat-leaderboard__card-score--mid');
      else scoreEl.classList.add('chat-leaderboard__card-score--low');
    } else {
      scoreEl.textContent = '—';
      scoreEl.classList.add('chat-leaderboard__card-score--none');
    }

    card.append(rankEl, body, scoreEl);
    return card;
  }

  // ── Viewer ──────────────────────────────────────────────────────────────

  function createCopyBtn(text) {
    const btn = createElement('button', 'lb-copy-btn');
    btn.type = 'button';
    btn.innerHTML = iconMarkup.copy;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(text);
      btn.innerHTML = iconMarkup.check;
      btn.style.color = 'var(--color-accent)';
      setTimeout(() => {
        btn.innerHTML = iconMarkup.copy;
        btn.style.color = '';
      }, 1200);
    });
    return btn;
  }

  function populateViewer(model) {
    if (!_viewerContentEl) return;
    _viewerContentEl.replaceChildren();

    // ── Header ─────────────────────────────────────────────────────────────
    const header = createElement('div', 'lb-viewer-header');
    const headerLeft = createElement('div', 'lb-viewer-header__left');
    const nameRow = createElement('div', 'lb-viewer-header__name-row');
    nameRow.append(createElement('h3', 'lb-viewer-header__title', model.name));
    if (model.intelligence !== null) {
      const scorePill = createElement(
        'span',
        `lb-score-pill lb-score-pill--${scoreTier(model.intelligence)}`,
      );
      scorePill.textContent = model.intelligence.toFixed(1);
      nameRow.append(scorePill);
    }
    if (model.provider) {
      const providerIcon = getProviderIconPath(model.provider);
      const badge = createElement('span', 'lb-provider-badge');
      if (providerIcon) {
        badge.append(
          createProviderIcon(providerIcon, {
            className: 'lb-provider-badge__icon',
            alt: model.provider,
          }),
        );
      }
      badge.append(model.provider);
      nameRow.append(badge);
    }
    headerLeft.append(nameRow);

    const idRow = createElement('div', 'lb-viewer-header__id-row');
    const idChip = createElement('span', 'lb-model-id-chip', model.slug);
    idRow.append(idChip, createCopyBtn(model.slug));
    headerLeft.append(idRow);

    const metaRow = createElement('div', 'lb-viewer-meta');
    metaRow.append(
      createElement('span', 'lb-viewer-meta__value', formatContext(model.contextLength) + ' ctx'),
    );
    metaRow.append(createSep());
    metaRow.append(
      createElement(
        'span',
        'lb-viewer-meta__value',
        model.isFree ? 'Free' : formatPrice(model.promptPrice) + '/1M',
      ),
    );
    if (model.isModerated) {
      metaRow.append(createSep());
      metaRow.append(createElement('span', 'lb-viewer-meta__moderated', 'Moderated'));
    }
    headerLeft.append(metaRow);
    header.append(headerLeft);
    _viewerContentEl.append(header);

    if (model.expirationDate) {
      const warn = createElement('div', 'lb-deprecation-warn');
      warn.textContent = `Deprecating ${formatDate(model.expirationDate) ?? model.expirationDate}`;
      _viewerContentEl.append(warn);
    }

    // ── Description ────────────────────────────────────────────────────────
    if (model.description) {
      const desc = createElement('p', 'lb-viewer-desc');
      desc.textContent =
        model.description.length > 280 ? model.description.slice(0, 280) + '…' : model.description;
      _viewerContentEl.append(desc);
    }

    // ── Capability pills ───────────────────────────────────────────────────
    if (model.caps.length > 0) {
      const pillRow = createElement('div', 'lb-viewer-pills');
      for (const cap of model.caps) {
        const pill = createElement('span', 'lb-pill');
        pill.textContent = CAPABILITY_LABELS[cap] ?? cap;
        pillRow.append(pill);
      }
      _viewerContentEl.append(pillRow);
    }

    // ── Benchmark scores ───────────────────────────────────────────────────
    if (model.intelligence !== null || model.coding !== null || model.agentic !== null) {
      const section = createSection(strings.model.scores);
      const grid = createElement('div', 'lb-scores-grid');
      if (model.intelligence !== null)
        grid.append(createBigScore(strings.model.intelligence, model.intelligence, 'intelligence'));
      if (model.coding !== null)
        grid.append(createBigScore(strings.model.coding, model.coding, 'coding'));
      if (model.agentic !== null)
        grid.append(createBigScore(strings.model.agentic, model.agentic, 'agentic'));
      section.append(grid);
      _viewerContentEl.append(section);
    }

    // ── Quick stats ────────────────────────────────────────────────────────
    {
      const section = createSection(strings.model.capabilities);

      if (model.inputModalities && model.inputModalities.length > 0) {
        section.append(createElement('div', 'lb-section__sublabel', 'Input'));
        const row = createElement('div', 'lb-modality-row');
        for (const mod of model.inputModalities) {
          row.append(createElement('span', 'lb-modality-chip', mod));
        }
        section.append(row);
      }

      if (model.outputModalities && model.outputModalities.length > 0) {
        section.append(createElement('div', 'lb-section__sublabel', 'Output'));
        const row = createElement('div', 'lb-modality-row');
        for (const mod of model.outputModalities) {
          row.append(createElement('span', 'lb-modality-chip', mod));
        }
        section.append(row);
      }

      const grid = createElement('div', 'lb-stats-grid');
      grid.append(
        createStatTile(strings.model.context, formatContext(model.contextLength) + ' tokens'),
      );
      if (model.maxOutput)
        grid.append(
          createStatTile(strings.model.maxOutput, formatContext(model.maxOutput) + ' tokens'),
        );
      if (model.tokenizer) grid.append(createStatTile('Tokenizer', model.tokenizer));
      if (model.knowledgeCutoff) grid.append(createStatTile('Knowledge', model.knowledgeCutoff));
      if (model.created) {
        const d = formatDate(model.created);
        if (d) grid.append(createStatTile('Released', d));
      }
      if (model.huggingFaceId) grid.append(createStatTile('HuggingFace', model.huggingFaceId));
      section.append(grid);
      _viewerContentEl.append(section);
    }

    // ── Pricing ────────────────────────────────────────────────────────────
    {
      const section = createSection(strings.model.pricing);
      const grid = createElement('div', 'lb-pricing-grid');
      grid.append(
        createPriceTile(strings.model.input, model.promptPrice),
        createPriceTile(strings.model.output, model.completionPrice),
      );
      if (model.cacheReadPrice)
        grid.append(createPriceTile(strings.model.cacheRead, model.cacheReadPrice));
      if (model.cacheWritePrice) grid.append(createPriceTile('Cache Write', model.cacheWritePrice));
      if (model.reasoningPrice) grid.append(createPriceTile('Reasoning', model.reasoningPrice));
      if (model.webSearchPrice) grid.append(createPriceTile('Web Search', model.webSearchPrice));
      if (model.imagePrice) grid.append(createPriceTile('Image Input', model.imagePrice));
      if (model.audioPrice) grid.append(createPriceTile('Audio Input', model.audioPrice));
      section.append(grid);
      _viewerContentEl.append(section);
    }

    // ── Design Arena ───────────────────────────────────────────────────────
    if (model.arena && model.arena.length > 0) {
      const section = createSection(strings.model.arena);
      const grid = createElement('div', 'lb-arena-grid');
      for (const a of model.arena) {
        grid.append(createArenaCard(a));
      }
      section.append(grid);
      _viewerContentEl.append(section);
    }

    // ── Supported Parameters ───────────────────────────────────────────────
    if (model.supportedParams.length > 0) {
      const section = createSection('Supported Parameters');
      const tagRow = createElement('div', 'lb-param-tags');
      for (const p of model.supportedParams) {
        const tag = createElement('span', 'lb-param-tag');
        tag.textContent = p.replace(/_/g, ' ');
        tagRow.append(tag);
      }
      section.append(tagRow);
      _viewerContentEl.append(section);
    }

    // ── Attribution ────────────────────────────────────────────────────────
    const attr = createElement('div', 'lb-attribution');
    attr.textContent = 'Data provided by OpenRouter';
    _viewerContentEl.append(attr);
  }

  // ── Helper builders ─────────────────────────────────────────────────────

  function createSection(title) {
    const section = createElement('div', 'lb-section');
    section.append(createElement('h4', 'lb-section__title', title));
    return section;
  }

  function createSep() {
    return createElement('span', 'lb-viewer-meta__sep');
  }

  function createBigScore(label, value, type) {
    const card = createElement('div', `lb-score-card lb-score-card--${type}`);
    const pct = Math.min(value / 70, 1);

    card.append(
      createElement('span', 'lb-score-card__value', value.toFixed(1)),
      createElement('span', 'lb-score-card__label', label),
    );

    const bar = createElement('div', 'lb-score-card__bar');
    const fill = createElement('div', 'lb-score-card__bar-fill');
    fill.style.setProperty('--pct', String(pct));
    bar.append(fill);
    card.append(bar);

    return card;
  }

  function createStatTile(label, value) {
    const tile = createElement('div', 'lb-stat-tile');
    tile.append(
      createElement('span', 'lb-stat-tile__label', label),
      createElement('span', 'lb-stat-tile__value', value),
    );
    return tile;
  }

  function createPriceTile(label, perToken) {
    const tile = createElement('div', 'lb-price-tile');
    const isFree = !perToken || perToken === '0';
    const valueEl = createElement(
      'span',
      `lb-price-tile__value${isFree ? ' lb-price-tile__value--free' : ''}`,
    );
    if (isFree) {
      valueEl.textContent = 'Free';
    } else {
      valueEl.append(
        document.createTextNode(formatPrice(perToken)),
        createElement('span', 'lb-price-tile__unit', ' / 1M tokens'),
      );
    }
    tile.append(createElement('span', 'lb-price-tile__label', label), valueEl);
    return tile;
  }

  function createArenaCard(a) {
    const card = createElement('div', 'lb-arena-card');
    const elo = createElement('span', 'lb-arena-card__elo', String(a.elo));
    const cat = createElement('span', 'lb-arena-card__cat', a.category);
    const stats = createElement('div', 'lb-arena-card__stats');
    stats.append(
      createElement('span', 'lb-arena-card__stat', `${a.win_rate.toFixed(1)}% win`),
      createElement('span', 'lb-arena-card__stat', `#${a.rank}`),
    );
    card.append(elo, cat, stats);
    return card;
  }

  function scoreTier(v) {
    if (v >= 55) return 'top';
    if (v >= 40) return 'mid';
    return 'low';
  }

  return { build, populateList };
}
