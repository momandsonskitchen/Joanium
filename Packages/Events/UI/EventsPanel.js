import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';

const FILTERS = ['all', 'channels', 'agents', 'errors'];

function toDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(toDate(value));
}

function formatDetailDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(toDate(value));
}

function compactText(value, limit = 150) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function channelLabel(strings, channelName) {
  return strings.channels[channelName] ?? channelName ?? strings.labels.channel;
}

function scheduleLabel(schedule, fallback) {
  if (!schedule || typeof schedule !== 'object') return fallback;
  if (schedule.type === 'startup') return fallback;
  if (schedule.type === 'weekly') return `${schedule.type} ${schedule.day ?? ''} ${schedule.time ?? ''}`.trim();
  return `${schedule.type ?? fallback} ${schedule.time ?? ''}`.trim();
}

function normalizeAgentRun(run, strings, index) {
  const startedAt = run.startedAt ?? run.firedAt ?? run.timestamp ?? new Date().toISOString();
  const status = run.error || run.status === 'error' ? 'error' : (run.status ?? 'success');

  return {
    id: run.id || `agent-${run.agentId ?? index}-${startedAt}`,
    type: 'agent',
    status,
    source: run.agentName || strings.labels.agent,
    title: run.agentName || strings.labels.agent,
    subtitle: scheduleLabel(run.schedule ?? run.trigger, strings.types.agent),
    timestamp: startedAt,
    finishedAt: run.finishedAt ?? run.firedAt ?? null,
    primary: run.prompt || run.summary || '',
    secondary: run.fullResponse || '',
    error: run.error ?? null,
    provider: run.provider ?? null,
    model: run.model ?? null,
    tokensIn: run.inputTokens ?? 0,
    tokensOut: run.outputTokens ?? 0,
    raw: run
  };
}

function normalizeChannelMessage(message, strings, index) {
  const timestamp = message.receivedAt ?? message.timestamp ?? message.repliedAt ?? new Date().toISOString();
  const status = message.error || message.status === 'error' ? 'error' : 'success';
  const source = channelLabel(strings, message.channel);

  return {
    id: message.id || `channel-${message.channel ?? index}-${timestamp}`,
    type: 'channel',
    status,
    source,
    title: source,
    subtitle: message.from || strings.labels.unknown,
    timestamp,
    finishedAt: message.repliedAt ?? message.timestamp ?? null,
    primary: message.incoming || '',
    secondary: message.reply || '',
    error: message.error ?? null,
    provider: message.provider ?? null,
    model: message.model ?? null,
    conversationId: message.conversationId ?? null,
    targetId: message.targetId ?? null,
    externalId: message.externalId ?? null,
    raw: message
  };
}

function filterEvents(events, filter) {
  if (filter === 'channels') return events.filter((event) => event.type === 'channel');
  if (filter === 'agents') return events.filter((event) => event.type === 'agent');
  if (filter === 'errors') return events.filter((event) => event.status === 'error');
  return events;
}

function eventSourceKey(event) {
  return `${event.type}:${event.source}`;
}

export function createEventsPanel(strings) {
  let panel = null;
  let listEl = null;
  let detailEl = null;
  let loadingEl = null;
  let emptyEl = null;
  let liveBadge = null;
  let filterButtons = new Map();
  let statTotal = null;
  let statSuccess = null;
  let statErrors = null;
  let statSources = null;
  let activeFilter = 'all';
  let selectedId = null;
  let events = [];
  let pollTimer = null;

  async function fetchEvents() {
    const [agentRuns, channelMessages] = await Promise.all([
      invokeIpc('agents:list-runs').catch(() => []),
      invokeIpc('channels:list-messages').catch(() => [])
    ]);

    const normalized = [
      ...(Array.isArray(agentRuns) ? agentRuns.map((run, index) => normalizeAgentRun(run, strings, index)) : []),
      ...(Array.isArray(channelMessages) ? channelMessages.map((message, index) => normalizeChannelMessage(message, strings, index)) : [])
    ];

    return normalized
      .sort((a, b) => toDate(b.timestamp) - toDate(a.timestamp))
      .slice(0, 240);
  }

  function updateStats() {
    statTotal.textContent = String(events.length);
    statSuccess.textContent = String(events.filter((event) => event.status === 'success').length);
    statErrors.textContent = String(events.filter((event) => event.status === 'error').length);
    statSources.textContent = String(new Set(events.map(eventSourceKey)).size);
  }

  function syncFilterButtons() {
    for (const [filter, button] of filterButtons) {
      button.classList.toggle('events-filter__button--active', filter === activeFilter);
    }
  }

  function createStatusBadge(event) {
    return createElement(
      'span',
      `events-row__status events-row__status--${event.status}`,
      strings.status[event.status] ?? event.status
    );
  }

  function selectEvent(event) {
    selectedId = event?.id ?? null;
    renderList();
    renderDetail(event);
  }

  function createEventRow(event) {
    const row = createElement(
      'button',
      `events-row events-row--${event.type}${event.id === selectedId ? ' events-row--active' : ''}`
    );
    row.type = 'button';

    const icon = createElement('span', 'events-row__icon');
    icon.append(createIcon(event.type === 'agent' ? 'tabAgents' : 'tabChannels', 'events-row__icon-svg'));

    const body = createElement('span', 'events-row__body');
    const top = createElement('span', 'events-row__top');
    top.append(
      createElement('span', 'events-row__title', event.title),
      createStatusBadge(event)
    );
    body.append(top);

    const meta = createElement('span', 'events-row__meta');
    meta.append(
      createElement('span', 'events-row__type', strings.types[event.type]),
      createElement('span', 'events-row__dot', ''),
      createElement('span', 'events-row__time', formatDate(event.timestamp))
    );
    body.append(meta);

    const primary = compactText(event.primary || event.error || event.secondary);
    if (primary) {
      body.append(createElement('span', 'events-row__preview', primary));
    }

    if (event.type === 'channel' && event.secondary) {
      const replyEl = createElement('span', 'events-row__reply-preview', compactText(event.secondary, 120));
      body.append(replyEl);
    }

    row.append(icon, body);
    row.addEventListener('click', () => selectEvent(event));
    return row;
  }

  function renderList() {
    if (!listEl || !emptyEl || !loadingEl) return;
    const filtered = filterEvents(events, activeFilter);
    listEl.replaceChildren();
    loadingEl.hidden = true;

    if (!events.length || !filtered.length) {
      emptyEl.textContent = events.length ? strings.states.noMatches : strings.states.empty;
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    for (const event of filtered) {
      listEl.append(createEventRow(event));
    }
  }

  function createDetailSection(label, value, className = '') {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const section = createElement('div', `events-detail__section${className ? ` ${className}` : ''}`);
    section.append(
      createElement('div', 'events-detail__section-label', label),
      createElement('div', 'events-detail__section-value', String(value))
    );
    return section;
  }

  function createMetaItem(label, value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const item = createElement('div', 'events-detail__meta-item');
    item.append(
      createElement('span', 'events-detail__meta-label', label),
      createElement('span', 'events-detail__meta-value', String(value))
    );
    return item;
  }

  function renderDetail(event) {
    if (!detailEl) return;
    detailEl.replaceChildren();

    if (!event) {
      detailEl.append(createElement('div', 'events-detail__empty', strings.states.selectedEmpty));
      return;
    }

    const header = createElement('div', 'events-detail__header');
    const badge = createElement('div', `events-detail__type events-detail__type--${event.type}`);
    badge.append(createIcon(event.type === 'agent' ? 'tabAgents' : 'tabChannels', 'events-detail__type-icon'));
    const titleWrap = createElement('div', 'events-detail__title-wrap');
    titleWrap.append(
      createElement('div', 'events-detail__eyebrow', strings.types[event.type]),
      createElement('h3', 'events-detail__title', event.title)
    );
    header.append(badge, titleWrap, createStatusBadge(event));

    const metaGrid = createElement('div', 'events-detail__meta');
    [
      createMetaItem(strings.labels.source, event.source),
      createMetaItem(strings.labels.status, strings.status[event.status] ?? event.status),
      createMetaItem(strings.labels.started, formatDetailDate(event.timestamp)),
      createMetaItem(strings.labels.finished, formatDetailDate(event.finishedAt)),
      createMetaItem(strings.labels.provider, event.provider),
      createMetaItem(strings.labels.model, event.model),
      createMetaItem(strings.labels.tokens, event.tokensIn || event.tokensOut ? String(Number(event.tokensIn ?? 0) + Number(event.tokensOut ?? 0)) : ''),
      createMetaItem(strings.labels.conversation, event.conversationId),
      createMetaItem(strings.labels.target, event.targetId),
      createMetaItem(strings.labels.externalId, event.externalId)
    ].filter(Boolean).forEach((item) => metaGrid.append(item));

    detailEl.append(header, metaGrid);

    const sections = event.type === 'channel'
      ? [
        createDetailSection(strings.labels.inbound, event.primary),
        createDetailSection(strings.labels.reply, event.secondary),
        createDetailSection(strings.labels.error, event.error, 'events-detail__section--error')
      ]
      : [
        createDetailSection(strings.labels.prompt, event.primary),
        createDetailSection(strings.labels.response, event.secondary),
        createDetailSection(strings.labels.error, event.error, 'events-detail__section--error')
      ];

    for (const section of sections.filter(Boolean)) {
      detailEl.append(section);
    }
  }

  async function populate({ pulse = false } = {}) {
    const previousFirstId = events[0]?.id ?? null;
    events = await fetchEvents();
    updateStats();
    renderList();

    const selected = events.find((event) => event.id === selectedId) ?? events[0] ?? null;
    if (!selectedId && selected) selectedId = selected.id;
    renderDetail(selected);

    if (pulse && previousFirstId && events[0]?.id !== previousFirstId) {
      liveBadge?.classList.add('events-live--pulse');
      setTimeout(() => liveBadge?.classList.remove('events-live--pulse'), 900);
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      void populate({ pulse: true });
    }, 2500);
  }

  async function clearEvents() {
    await Promise.all([
      invokeIpc('agents:clear-runs').catch(() => null),
      invokeIpc('channels:clear-messages').catch(() => null)
    ]);
    selectedId = null;
    await populate();
  }

  function buildStat(label) {
    const tile = createElement('div', 'events-stats__tile');
    const value = createElement('strong', 'events-stats__value', '0');
    tile.append(value, createElement('span', 'events-stats__label', label));
    return { tile, value };
  }

  function build() {
    panel = createElement('div', 'events');
    panel.hidden = true;

    // ── Header ───────────────────────────────────────────────────────────────
    liveBadge = createElement('span', 'events-live', strings.states.live);

    const refreshButton = createElement('button', 'events-action');
    refreshButton.type = 'button';
    refreshButton.setAttribute('aria-label', strings.actions.refresh);
    refreshButton.append(createIcon('retry', 'events-action__icon'));
    refreshButton.addEventListener('click', () => { void populate({ pulse: true }); });

    const clearButton = createElement('button', 'events-action events-action--danger');
    clearButton.type = 'button';
    clearButton.setAttribute('aria-label', strings.actions.clearAll);
    clearButton.append(createIcon('trash', 'events-action__icon'), createElement('span', 'events-action__label', strings.actions.clear));
    clearButton.addEventListener('click', () => { void clearEvents(); });

    const headerActions = createElement('div', 'events__actions');
    headerActions.append(liveBadge, refreshButton, clearButton);

    const header = createPanelHeader({
      title: strings.title,
      subtitle: strings.subtitle,
      actions: [headerActions]
    });

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = createElement('div', 'events-stats');
    const total   = buildStat(strings.stats.total);
    const success = buildStat(strings.stats.success);
    const errors  = buildStat(strings.stats.errors);
    const sources = buildStat(strings.stats.sources);
    statTotal   = total.value;
    statSuccess = success.value;
    statErrors  = errors.value;
    statSources = sources.value;
    stats.append(total.tile, success.tile, errors.tile, sources.tile);

    // ── Filters + feed ────────────────────────────────────────────────────────
    const filters = createElement('div', 'events-filter');
    for (const filter of FILTERS) {
      const button = createElement(
        'button',
        `events-filter__button${filter === activeFilter ? ' events-filter__button--active' : ''}`,
        strings.filters[filter]
      );
      button.type = 'button';
      button.addEventListener('click', () => {
        activeFilter = filter;
        syncFilterButtons();
        renderList();
      });
      filterButtons.set(filter, button);
      filters.append(button);
    }

    const body = createElement('div', 'events__body');
    const feed = createElement('section', 'events-feed');
    loadingEl = createElement('div', 'events-feed__state', strings.states.loading);
    emptyEl = createElement('div', 'events-feed__state');
    emptyEl.hidden = true;
    listEl = createElement('div', 'events-feed__list');
    feed.append(filters, loadingEl, emptyEl, listEl);

    detailEl = createElement('aside', 'events-detail');
    renderDetail(null);
    body.append(feed, detailEl);

    panel.append(header, stats, body);
    panel._populate = populate;
    void populate();
    startPolling();
    return panel;
  }

  return { build, populate };
}
