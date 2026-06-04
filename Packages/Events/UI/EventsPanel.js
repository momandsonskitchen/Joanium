import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createPanelHeader } from '../../Shared/PanelHeader/PanelHeader.js';
import { renderMarkdown } from '../../Shared/Markdown/MarkdownRenderer.js';
import { parseThinkingFromText } from '../../Shared/Markdown/ThinkingParser.js';
import { getConnectorIconPathForToolName } from '../../Shared/ConnectorIcons/ConnectorIcons.js';
import { toFileUrl } from '../../Shared/Utils/UrlUtils.js';

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
    minute: '2-digit',
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
    second: '2-digit',
  }).format(toDate(value));
}

// ---------------------------------------------------------------------------
// Tool-call block parser
// Splits a response string into alternating text / joanium-tool segments.
// ---------------------------------------------------------------------------

function parseToolBlocks(text) {
  const parts = [];
  const re = /```(?:joanium-tool|joanium-terminal)\s*([\s\S]*?)```/gi;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      if (segment.trim()) parts.push({ type: 'text', content: segment });
    }
    try {
      const payload = JSON.parse(match[1].trim());
      parts.push({
        type: 'tool',
        toolName: String(payload.tool ?? 'tool'),
        params: payload.parameters ?? null,
      });
    } catch {
      // Malformed block — fall back to plain text so nothing is lost.
      parts.push({ type: 'text', content: match[0] });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    if (tail.trim()) parts.push({ type: 'text', content: tail });
  }
  return parts;
}

function compactText(value, limit = 150) {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function channelLabel(strings, channelName) {
  return strings.channels[channelName] ?? channelName ?? strings.labels.channel;
}

function scheduleLabel(schedule, fallback) {
  if (!schedule || typeof schedule !== 'object') return fallback;
  if (schedule.type === 'startup') return fallback;
  if (schedule.type === 'weekly')
    return `${schedule.type} ${schedule.day ?? ''} ${schedule.time ?? ''}`.trim();
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
    streamTool: run.streamTool ?? null,
    streamDepth: run.streamDepth ?? 0,
    // Persistent terminal/tool-call history — populated by the agent runner as
    // each tool completes. This survives after the run finishes so tool cards
    // remain visible in the detail pane even when the final response is shown.
    terminals: Array.isArray(run.terminals) ? run.terminals : [],
    avatarUrl: toFileUrl(run.agentAvatarPath ?? null),
    channelKey: null,
    raw: run,
  };
}

function normalizeChannelMessage(message, strings, index) {
  const timestamp =
    message.receivedAt ?? message.timestamp ?? message.repliedAt ?? new Date().toISOString();
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
    avatarUrl: null, // resolved after channel icon paths are loaded
    channelKey: message.channel ?? null,
    raw: message,
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

  // channel name → file:// URL for that channel's logo image
  let channelIconUrls = {};

  async function fetchEvents() {
    const [agentRuns, channelMessages, rawIconPaths] = await Promise.all([
      invokeIpc('agents:list-runs').catch(() => []),
      invokeIpc('channels:list-messages').catch(() => []),
      invokeIpc('channels:icon-paths').catch(() => ({})),
    ]);

    // Build a channel-name → file:// URL map from the raw OS paths.
    channelIconUrls = {};
    for (const [name, filePath] of Object.entries(rawIconPaths ?? {})) {
      const url = toFileUrl(filePath);
      if (url) channelIconUrls[name] = url;
    }

    const normalized = [
      ...(Array.isArray(agentRuns)
        ? agentRuns.map((run, index) => normalizeAgentRun(run, strings, index))
        : []),
      ...(Array.isArray(channelMessages)
        ? channelMessages.map((message, index) => {
            const event = normalizeChannelMessage(message, strings, index);
            // Resolve the channel icon URL now that we have the paths map.
            if (event.channelKey && channelIconUrls[event.channelKey]) {
              event.avatarUrl = channelIconUrls[event.channelKey];
            }
            return event;
          })
        : []),
    ];

    return normalized.sort((a, b) => toDate(b.timestamp) - toDate(a.timestamp)).slice(0, 240);
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
      strings.status[event.status] ?? event.status,
    );
  }

  function selectEvent(event) {
    selectedId = event?.id ?? null;
    lastDetailSnapshot = ''; // force detail rebuild on manual selection
    renderList();
    renderDetail(event);
  }

  // Returns either an <img> (when a real avatar/logo URL is available) or the
  // generic SVG icon, ready to be appended into the icon container.
  function buildAvatarContent(event, iconClass, imgClass) {
    if (event.avatarUrl) {
      const img = document.createElement('img');
      img.src = event.avatarUrl;
      img.alt = event.title;
      img.className = imgClass;
      img.draggable = false;
      return img;
    }
    return createIcon(event.type === 'agent' ? 'tabAgents' : 'tabChannels', iconClass);
  }

  function createEventRow(event) {
    const row = createElement(
      'button',
      `events-row events-row--${event.type}${event.id === selectedId ? ' events-row--active' : ''}`,
    );
    row.type = 'button';

    const icon = createElement('span', 'events-row__icon');
    icon.append(buildAvatarContent(event, 'events-row__icon-svg', 'events-row__avatar-img'));

    const body = createElement('span', 'events-row__body');
    const top = createElement('span', 'events-row__top');
    top.append(createElement('span', 'events-row__title', event.title), createStatusBadge(event));
    body.append(top);

    const meta = createElement('span', 'events-row__meta');
    meta.append(
      createElement('span', 'events-row__type', strings.types[event.type]),
      createElement('span', 'events-row__dot', ''),
      createElement('span', 'events-row__time', formatDate(event.timestamp)),
    );
    body.append(meta);

    const primary = compactText(event.primary || event.error || event.secondary);
    if (primary) {
      body.append(createElement('span', 'events-row__preview', primary));
    }

    if (event.type === 'channel' && event.secondary) {
      const replyEl = createElement(
        'span',
        'events-row__reply-preview',
        compactText(event.secondary, 120),
      );
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

  // ── createToolCallCard ──────────────────────────────────────────────────
  // Renders a single tool-call block (from embedded joanium-tool code blocks
  // in the response text) as a styled card that matches the chat UI exactly,
  // using the same chat-terminal-call CSS classes as TerminalPanel.js.

  function createToolCallCard(toolName, params) {
    const hasOutput = params && typeof params === 'object' && Object.keys(params).length > 0;

    const card = hasOutput
      ? Object.assign(document.createElement('details'), {
          className: 'chat-terminal-call chat-terminal-call--completed',
        })
      : createElement('section', 'chat-terminal-call chat-terminal-call--completed');

    const header = createElement(hasOutput ? 'summary' : 'div', 'chat-terminal-call__header');

    const identity = createElement('div', 'chat-terminal-call__identity');

    const connectorIconPath = getConnectorIconPathForToolName(toolName);
    if (connectorIconPath) {
      const img = document.createElement('img');
      img.src = connectorIconPath;
      img.alt = '';
      img.className = 'chat-terminal-call__icon chat-terminal-call__icon--connector';
      identity.append(img);
    } else {
      identity.append(createIcon('terminal', 'chat-terminal-call__icon'));
    }

    const copy = createElement('div', 'chat-terminal-call__copy');
    copy.append(
      createElement('div', 'chat-terminal-call__label', toolName),
      createElement('div', 'chat-terminal-call__command', toolName),
    );
    identity.append(copy);

    const statusEl = createElement('span', 'chat-terminal-call__status', strings.labels.toolUsed);

    header.append(identity);

    if (hasOutput) {
      const trailing = createElement('div', 'chat-terminal-call__trailing');
      trailing.append(statusEl, createIcon('chevronDown', 'chat-terminal-call__details-icon'));
      header.append(trailing);
      const pre = createElement(
        'pre',
        'chat-terminal-call__output',
        JSON.stringify(params, null, 2),
      );
      card.append(header, pre);
    } else {
      header.append(statusEl);
      card.append(header);
    }

    return card;
  }

  // ── createAgentTerminalCard ─────────────────────────────────────────────
  // Renders a single terminal object from the agent run's persistent
  // run.terminals array. Uses the same chat-terminal-call classes so the
  // cards look identical to the chat UI — and they survive after the run
  // finishes because the data lives in the array, not in the response text.

  function createAgentTerminalCard(terminal) {
    const status = terminal.status ?? 'completed';
    const hasOutput = Boolean(terminal.output || terminal.error);

    const card = hasOutput
      ? Object.assign(document.createElement('details'), {
          className: `chat-terminal-call chat-terminal-call--${status}`,
        })
      : createElement('section', `chat-terminal-call chat-terminal-call--${status}`);

    const header = createElement(hasOutput ? 'summary' : 'div', 'chat-terminal-call__header');

    const identity = createElement('div', 'chat-terminal-call__identity');

    const toolName = terminal.command || terminal.tool || terminal.label || '';
    const connectorIconPath = getConnectorIconPathForToolName(toolName);
    if (connectorIconPath) {
      const img = document.createElement('img');
      img.src = connectorIconPath;
      img.alt = '';
      img.className = 'chat-terminal-call__icon chat-terminal-call__icon--connector';
      identity.append(img);
    } else {
      identity.append(createIcon('terminal', 'chat-terminal-call__icon'));
    }

    const copy = createElement('div', 'chat-terminal-call__copy');
    copy.append(
      createElement(
        'div',
        'chat-terminal-call__label',
        terminal.label || toolName || strings.labels.toolUsed,
      ),
      createElement('div', 'chat-terminal-call__command', toolName),
    );
    identity.append(copy);

    const statusEl = createElement(
      'span',
      'chat-terminal-call__status',
      strings.status[terminal.status] ?? strings.labels.toolUsed,
    );

    header.append(identity);

    if (hasOutput) {
      const output = [terminal.output, terminal.error].filter(Boolean).join('\n\n').trim();
      const trailing = createElement('div', 'chat-terminal-call__trailing');
      trailing.append(statusEl, createIcon('chevronDown', 'chat-terminal-call__details-icon'));
      header.append(trailing);
      const pre = createElement('pre', 'chat-terminal-call__output', output);
      card.append(header, pre);
    } else {
      header.append(statusEl);
      card.append(header);
    }

    return card;
  }

  // ── buildThinkingDisclosure ───────────────────────────────────────────────
  // Creates a collapsible reasoning block using the same chat-message__thinking
  // classes so it inherits the purple theme and expand/collapse behaviour.

  function buildThinkingDisclosure(thinkingText) {
    const wrap = document.createElement('details');
    wrap.className = 'chat-message__thinking';

    const summary = createElement('summary', 'chat-message__thinking-summary');
    summary.append(
      createIcon('thinking', 'chat-message__thinking-icon'),
      createElement('span', 'chat-message__thinking-label', strings.labels.reasoning),
    );
    wrap.append(summary);

    const body = createElement('div', 'chat-message__thinking-body');
    body.append(createElement('p', 'chat-message__thinking-text', String(thinkingText).trim()));
    wrap.append(body);
    return wrap;
  }

  // ── resolveThinking ───────────────────────────────────────────────────────
  // Attempts to pull thinking/reasoning text from wherever the agent runner
  // or channel handler stored it. Checks common field names so a rename on
  // the backend side doesn't silently hide reasoning in the events pane.

  function resolveThinking(raw) {
    if (!raw || typeof raw !== 'object') return '';
    const candidates = [
      raw.thinking,
      raw.thinkingText,
      raw.reasoningText,
      raw.reasoning,
      raw.thinkingContent,
    ];
    for (const val of candidates) {
      if (val && typeof val === 'string' && val.trim()) return val.trim();
    }
    return '';
  }

  // ── createDetailSection ───────────────────────────────────────────────────
  // Generic section: label + markdown-rendered value.

  function createDetailSection(label, value, className = '') {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const section = createElement(
      'div',
      `events-detail__section${className ? ` ${className}` : ''}`,
    );
    const valueEl = createElement('div', 'events-detail__section-value');
    valueEl.append(renderMarkdown(String(value)));
    section.append(createElement('div', 'events-detail__section-label', label), valueEl);
    return section;
  }

  // ── createResponseSection ─────────────────────────────────────────────────
  // Like createDetailSection but also strips and renders any inline <think>
  // blocks as a collapsible reasoning disclosure widget above the main content.
  // Tool-call blocks embedded in the text (joanium-tool / joanium-terminal)
  // are rendered as chat-terminal-call cards matching the chat UI.

  function createResponseSection(label, value, className = '') {
    if (value === null || value === undefined || String(value).trim() === '') return null;

    const { content, thinking } = parseThinkingFromText(String(value));

    const section = createElement(
      'div',
      `events-detail__section${className ? ` ${className}` : ''}`,
    );
    section.append(createElement('div', 'events-detail__section-label', label));

    // Reasoning block — only when the model emitted inline thinking.
    if (thinking) {
      section.append(buildThinkingDisclosure(thinking));
    }

    // Main response content — text segments rendered as markdown, tool call
    // blocks rendered as styled tool call cards (matching the chat view).
    if (content.trim()) {
      const valueEl = createElement('div', 'events-detail__section-value');
      const parts = parseToolBlocks(content);
      for (const part of parts) {
        if (part.type === 'tool') {
          valueEl.append(createToolCallCard(part.toolName, part.params));
        } else if (part.content.trim()) {
          valueEl.append(renderMarkdown(part.content));
        }
      }
      section.append(valueEl);
    }

    return section;
  }

  // ── createTerminalsSection ────────────────────────────────────────────────
  // Wraps an array of terminal objects (from the agent run's persistent
  // run.terminals) into an events-detail section containing chat-terminal-call
  // cards. Returns null when the array is empty.

  function createTerminalsSection(terminals) {
    if (!Array.isArray(terminals) || terminals.length === 0) return null;

    const section = createElement('div', 'events-detail__section');
    section.append(createElement('div', 'events-detail__section-label', strings.labels.toolUsed));

    const valueEl = createElement('div', 'events-detail__tools');
    for (const terminal of terminals) {
      valueEl.append(createAgentTerminalCard(terminal));
    }
    section.append(valueEl);
    return section;
  }

  function createMetaItem(label, value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const item = createElement('div', 'events-detail__meta-item');
    item.append(
      createElement('span', 'events-detail__meta-label', label),
      createElement('span', 'events-detail__meta-value', String(value)),
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
    badge.append(buildAvatarContent(event, 'events-detail__type-icon', 'events-detail__type-img'));
    const titleWrap = createElement('div', 'events-detail__title-wrap');
    titleWrap.append(
      createElement('div', 'events-detail__eyebrow', strings.types[event.type]),
      createElement('h3', 'events-detail__title', event.title),
    );
    header.append(badge, titleWrap, createStatusBadge(event));

    const metaGrid = createElement('div', 'events-detail__meta');
    [
      createMetaItem(strings.labels.source, event.source),
      createMetaItem(strings.labels.started, formatDetailDate(event.timestamp)),
      createMetaItem(strings.labels.finished, formatDetailDate(event.finishedAt)),
      createMetaItem(strings.labels.provider, event.provider),
      createMetaItem(strings.labels.model, event.model),
      createMetaItem(
        strings.labels.tokens,
        event.tokensIn || event.tokensOut
          ? String(Number(event.tokensIn ?? 0) + Number(event.tokensOut ?? 0))
          : '',
      ),
      createMetaItem(strings.labels.conversation, event.conversationId),
      createMetaItem(strings.labels.target, event.targetId),
      createMetaItem(strings.labels.externalId, event.externalId),
    ]
      .filter(Boolean)
      .forEach((item) => metaGrid.append(item));

    detailEl.append(header, metaGrid);

    // ── Build content sections ───────────────────────────────────────────────
    //
    // For agent runs the layout is:
    //   Prompt → Thinking → Tool calls → Response → Error
    //
    // "Thinking" comes from the raw run data (run.thinking / run.thinkingText /
    // etc.) or from inline <think> tags in the response via createResponseSection.
    //
    // "Tool calls" are read from the persistent event.terminals array first so
    // they survive after the run finishes. If the array is empty we fall back
    // to parsing embedded joanium-tool blocks from the response text.
    //
    // For channel replies the layout is:
    //   Inbound → Reply (with inline thinking + tool blocks) → Error

    let sections;

    if (event.type === 'channel') {
      sections = [
        createDetailSection(strings.labels.inbound, event.primary),
        createResponseSection(strings.labels.reply, event.secondary),
        createDetailSection(strings.labels.error, event.error, 'events-detail__section--error'),
      ];
    } else {
      // Agent run — resolve thinking from the raw run object.
      const thinkingText = resolveThinking(event.raw);

      // Decide whether to render tool calls from the persistent terminals
      // array or by parsing embedded blocks from the response text.
      // Prefer the array so cards persist after the run completes.
      const hasTerminals = Array.isArray(event.terminals) && event.terminals.length > 0;

      sections = [
        createDetailSection(strings.labels.prompt, event.primary),
        // Reasoning block from stored thinking data.
        thinkingText ? buildThinkingDisclosure(thinkingText) : null,
        // Tool calls — persistent array takes priority over embedded blocks.
        hasTerminals ? createTerminalsSection(event.terminals) : null,
        // Response text.
        // When we have a terminals array: just render the clean response text
        // (avoids showing duplicate tool cards from embedded blocks).
        // When we have no terminals: use createResponseSection which parses
        // embedded joanium-tool blocks and inline <think> tags (handles
        // streaming where the terminals array may not be populated yet).
        hasTerminals
          ? createDetailSection(
              strings.labels.response,
              event.secondary,
              event.status === 'running' ? 'events-detail__section--live' : '',
            )
          : createResponseSection(
              strings.labels.response,
              event.secondary,
              event.status === 'running' ? 'events-detail__section--live' : '',
            ),
        createDetailSection(strings.labels.error, event.error, 'events-detail__section--error'),
      ];
    }

    for (const section of sections.filter(Boolean)) {
      detailEl.append(section);
    }
  }

  // Snapshot of the selected event used to detect whether the detail pane
  // actually needs to be rebuilt on the next poll.  Stored as a JSON string
  // so a deep equality check is a single === comparison.
  let lastDetailSnapshot = '';

  async function populate({ pulse = false } = {}) {
    const previousFirstId = events[0]?.id ?? null;
    events = await fetchEvents();
    updateStats();
    renderList();

    const selected = events.find((event) => event.id === selectedId) ?? events[0] ?? null;
    if (!selectedId && selected) selectedId = selected.id;

    // Only rebuild the detail pane when something actually changed.  Rebuilding
    // on every 2.5 s poll collapses any open <details> (tool cards / thinking
    // blocks) because replaceChildren() destroys the DOM state.
    const snapshot = selected ? JSON.stringify(selected) : '';
    if (snapshot !== lastDetailSnapshot) {
      lastDetailSnapshot = snapshot;
      renderDetail(selected);
    }

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
      invokeIpc('channels:clear-messages').catch(() => null),
    ]);
    selectedId = null;
    lastDetailSnapshot = '';
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
    const header = createPanelHeader({
      title: strings.title,
      subtitle: strings.subtitle,
    });

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = createElement('div', 'events-stats');
    const total = buildStat(strings.stats.total);
    const success = buildStat(strings.stats.success);
    const errors = buildStat(strings.stats.errors);
    const sources = buildStat(strings.stats.sources);
    statTotal = total.value;
    statSuccess = success.value;
    statErrors = errors.value;
    statSources = sources.value;
    stats.append(total.tile, success.tile, errors.tile, sources.tile);

    // ── Filters + feed ────────────────────────────────────────────────────────
    const filters = createElement('div', 'events-filter');
    for (const filter of FILTERS) {
      const button = createElement(
        'button',
        `events-filter__button${filter === activeFilter ? ' events-filter__button--active' : ''}`,
        strings.filters[filter],
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

    const clearButton = createElement('button', 'events-filter__clear');
    clearButton.type = 'button';
    clearButton.setAttribute('aria-label', strings.actions.clearAll);
    clearButton.textContent = strings.actions.clear;
    clearButton.addEventListener('click', () => {
      void clearEvents();
    });
    filters.append(clearButton);

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
