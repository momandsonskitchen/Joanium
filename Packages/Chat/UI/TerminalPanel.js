import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { formatTerminalResultForModel as formatRendererTerminalResultForModel } from '../../Shared/ToolLoop/RendererToolLoop.js';
import { createSubAgentOutputSection, createSubAgentPromptSection } from './SubAgentSections.js';

// ── Connector icon map: connector id → filename in Assets/Icons/ ─────────────
// Mirrors the ICON_MAP in ConnectorsPanel.js so tool cards can show the right
// service logo instead of the generic terminal glyph.
const CONNECTOR_ICON_MAP = {
  github: 'Github',
  openweather: 'OpenWeatherMap',
  open_meteo: 'OpenMeteo',
  coingecko: 'CoinGecko',
  google: 'Google',
  gmail: 'Gmail',
  drive: 'Drive',
  calendar: 'Calendar',
  notion: 'Notion',
  slack: 'Slack',
  discord: 'Discord',
  telegram: 'Telegram',
  todoist: 'Tasks',
  spotify: 'Spotify',
  stripe: 'Stripe',
  supabase: 'Supabase',
  vercel: 'Vercel',
  netlify: 'Netlify',
  gitlab: 'Gitlab',
  jira: 'Jira',
  linear: 'Linear',
  hubspot: 'Hubspot',
  sentry: 'Sentry',
  figma: 'Figma',
  unsplash: 'Unsplash',
  wikipedia: 'Wikipedia',
  wikimedia: 'Wikipedia',
  nasa: 'Nasa',
  perplexity: 'Perplexity',
  youtube: 'Youtube',
  whatsapp: 'WhatsApp',
  cloudflare: 'Cloudflare',
  hackernews: 'HackerNews',
  airtable: 'Airtable',
  arxiv: 'Arxiv',
  npm: 'Npm',
  reddit: 'Reddit',
  stackoverflow: 'StackOverflow',
  itunes: 'iTunes',
};

/**
 * Resolves the icon path for a connector by its ID.
 * Path is relative to Packages/Shell/UI/App.html (the renderer entry point).
 * Returns null when no icon is registered for that connector.
 *
 * @param {string} connectorId
 * @returns {string|null}
 */
function getConnectorIconPath(connectorId) {
  const file = CONNECTOR_ICON_MAP[String(connectorId ?? '').toLowerCase()];
  return file ? `../../../Assets/Icons/${file}.png` : null;
}

/**
 * Derives the likely connector ID from a tool name by splitting on the first
 * underscore.  For example:
 *   gmail_search_emails → gmail
 *   drive_list_files    → drive
 *   run_shell_command   → run  (no match → falls back to terminal icon)
 *
 * @param {string} toolName
 * @returns {string}
 */
function connectorIdFromToolName(toolName) {
  return String(toolName ?? '')
    .split('_')[0]
    .toLowerCase();
}

/**
 * Creates the icon element for a tool card header.
 * Uses the connector's branded image when one exists; otherwise falls back to
 * the generic terminal glyph so built-in tools look unchanged.
 *
 * @param {string} toolName  The raw tool name stored in terminal.command
 * @returns {HTMLElement}
 */
function createToolCardIcon(toolName) {
  const connectorId = connectorIdFromToolName(toolName);
  const iconPath = getConnectorIconPath(connectorId);

  if (iconPath) {
    const img = document.createElement('img');
    img.src = iconPath;
    img.alt = '';
    img.className = 'chat-terminal-call__icon chat-terminal-call__icon--connector';
    return img;
  }

  return createIcon('terminal', 'chat-terminal-call__icon');
}

// ─────────────────────────────────────────────────────────────────────────────

export function getTerminalToolLabel(strings, tool) {
  return strings.terminal?.toolLabels?.[tool] ?? tool;
}

export function getTerminalActionSummary(action, strings) {
  const payload = action?.payload ?? {};

  if (payload.command) {
    return payload.command;
  }

  if (payload.query) {
    return payload.query;
  }

  if (payload.path) {
    return payload.path;
  }

  if (payload.working_directory) {
    return payload.working_directory;
  }

  return getTerminalToolLabel(strings, action?.tool);
}

function createSubAgentCallElement(terminal, strings) {
  const status = terminal.status ?? 'running';
  const subAgents = terminal.subAgents ?? [];
  const doneCount = subAgents.filter(
    (a) => a.status === 'completed' || a.status === 'failed',
  ).length;

  const card = createElement(
    'section',
    `chat-terminal-call chat-terminal-call--${status} chat-subagent-call`,
  );

  const header = createElement('div', 'chat-terminal-call__header');
  const identity = createElement('div', 'chat-terminal-call__identity');
  const icon = createIcon('tabAgents', 'chat-terminal-call__icon');
  const copy = createElement('div', 'chat-terminal-call__copy');
  const label = createElement(
    'div',
    'chat-terminal-call__label',
    terminal.label || strings.tools.subAgentsLabel,
  );
  const count = createElement('div', 'chat-subagent-call__count');
  count.textContent =
    subAgents.length > 0
      ? formatText(strings.tools.subAgentsCountProgress, {
          done: String(doneCount),
          total: String(subAgents.length),
        })
      : (terminal.statusLabel ?? strings.tools.subAgentsRunning);
  copy.append(label, count);
  identity.append(icon, copy);
  const statusEl = createElement(
    'span',
    'chat-terminal-call__status',
    terminal.statusLabel ?? status,
  );
  header.append(identity, statusEl);
  card.append(header);

  if (subAgents.length > 0) {
    const agentsContainer = createElement('div', 'chat-subagent-call__agents');

    for (const agent of subAgents) {
      const agentStatus = agent.status ?? 'queued';
      const details = document.createElement('details');
      details.className = `chat-subagent-call__agent chat-subagent-call__agent--${agentStatus}`;

      const summary = createElement('summary', 'chat-subagent-call__agent-summary');
      const statusDot = createElement(
        'span',
        `chat-subagent-call__agent-status chat-subagent-call__agent-status--${agentStatus}`,
      );

      const info = createElement('div', 'chat-subagent-call__agent-info');
      const title = createElement('div', 'chat-subagent-call__agent-title', agent.title || '');
      const goal = createElement('div', 'chat-subagent-call__agent-goal', agent.goal || '');
      info.append(title, goal);

      const badge = createElement('span', 'chat-subagent-call__agent-badge');
      if (agentStatus === 'running') badge.textContent = strings.tools.subAgentStatusRunning;
      else if (agentStatus === 'completed') badge.textContent = strings.tools.subAgentStatusDone;
      else if (agentStatus === 'failed') badge.textContent = strings.tools.subAgentStatusFailed;
      else badge.textContent = strings.tools.subAgentStatusQueued;

      const chevron = createIcon('chevronDown', 'chat-subagent-call__agent-chevron');

      summary.append(statusDot, info, badge, chevron);
      details.append(summary);

      const body = createElement('div', 'chat-subagent-call__agent-body');

      if (agent.prompt) {
        body.append(createSubAgentPromptSection(agent, strings));
      }

      if (agent.output || agent.error) {
        body.append(createSubAgentOutputSection(agent, strings));
      }

      details.append(body);
      agentsContainer.append(details);
    }

    card.append(agentsContainer);
  }

  return card;
}

export function createTerminalCallElement(terminal, strings) {
  if (Array.isArray(terminal.subAgents)) {
    return createSubAgentCallElement(terminal, strings);
  }

  const status = terminal.status ?? 'running';
  const card = createElement('section', `chat-terminal-call chat-terminal-call--${status}`);
  const header = createElement('div', 'chat-terminal-call__header');
  const identity = createElement('div', 'chat-terminal-call__identity');

  // Use the connector's branded icon when the tool belongs to a known connector;
  // otherwise fall back to the generic terminal glyph.
  const icon = createToolCardIcon(terminal.command ?? '');

  const copy = createElement('div', 'chat-terminal-call__copy');
  const label = createElement(
    'div',
    'chat-terminal-call__label',
    terminal.label || strings.terminal.title,
  );
  const command = createElement(
    'div',
    'chat-terminal-call__command',
    terminal.command || terminal.summary || '',
  );
  copy.append(label, command);
  identity.append(icon, copy);
  const statusEl = createElement(
    'span',
    'chat-terminal-call__status',
    terminal.statusLabel ?? status,
  );
  header.append(identity, statusEl);
  card.append(header);

  const output = [terminal.output, terminal.error].filter(Boolean).join('\n\n').trim();
  if (output) {
    const details = document.createElement('details');
    details.className = 'chat-terminal-call__details';
    const summary = createElement('summary', 'chat-terminal-call__details-summary');
    summary.append(
      createIcon('chevronDown', 'chat-terminal-call__details-icon'),
      createElement('span', '', strings.terminal.outputLabel),
    );
    const pre = createElement('pre', 'chat-terminal-call__output', output);
    details.append(summary, pre);
    card.append(details);
  }

  return card;
}

export function createChatTerminalPanel(strings, { onOpenChange } = {}) {
  let panelRef = null;
  let isOpen = false;

  // ── Tab state ──────────────────────────────────────────────────────────────
  // Each tab is an independent terminal session with its own cwd, history, and
  // running process. activeTabIndex always points into the tabs array.
  function createTabState() {
    return {
      cwd: '',
      outputValue: '',
      activeProcessId: null,
      isRunning: false,
      commandHistory: [],
      historyIndex: -1,
      currentInput: '',
    };
  }

  function getActiveTab() {
    return tabs[activeTabIndex] ?? tabs[0];
  }

  let activeTabIndex = 0;
  let tabs = [createTabState()];

  let outputEl = null;
  let inputEl = null;
  let promptEl = null;
  let statusText = null;

  function setStatus(text, tone = '') {
    if (!statusText) return;
    statusText.textContent = text;
    statusText.className = `chat-terminal-drawer__status${tone ? ` chat-terminal-drawer__status--${tone}` : ''}`;
  }

  function replaceOutput(text) {
    const tab = getActiveTab();
    if (!tab) return;
    tab.outputValue = String(text ?? '');
    if (outputEl) {
      outputEl.textContent = tab.outputValue;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  function appendOutputForTab(tabIndex, text) {
    const tab = tabs[tabIndex];
    if (!tab) return;
    tab.outputValue = `${tab.outputValue}${String(text ?? '')}`;
    if (tab.outputValue.length > 160000) {
      tab.outputValue = tab.outputValue.slice(tab.outputValue.length - 160000);
    }
    if (tabIndex === activeTabIndex && outputEl) {
      outputEl.textContent = tab.outputValue;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  function appendOutput(text) {
    appendOutputForTab(activeTabIndex, text);
  }

  function setRunning(running) {
    const tab = getActiveTab();
    if (tab) tab.isRunning = running;
    if (inputEl) {
      inputEl.disabled = running;
      if (!running) requestAnimationFrame(() => inputEl?.focus());
    }
    if (promptEl) {
      promptEl.classList.toggle('chat-terminal-drawer__prompt--running', running);
    }
  }

  function updatePrompt() {
    if (!promptEl) return;
    const cwd = getActiveTab()?.cwd ?? '';
    const short = cwd.length > 48 ? `\u2026${cwd.slice(-48)}` : cwd;
    promptEl.textContent = short ? `${short} >` : '>';
  }

  function syncCwd(nextCwd) {
    const tab = getActiveTab();
    if (tab) tab.cwd = nextCwd || tab.cwd;
    updatePrompt();
  }

  async function loadDefaultCwdForTab(tabIndex) {
    try {
      const result = await invokeIpc('terminal:get-default-cwd');
      if (result?.ok && tabs[tabIndex]) {
        tabs[tabIndex].cwd = result.cwd;
        if (tabIndex === activeTabIndex) updatePrompt();
      }
    } catch {
      // ignore
    }
  }

  async function loadDefaultCwd() {
    await loadDefaultCwdForTab(activeTabIndex);
  }

  async function assessCommand(command) {
    const result = await invokeIpc('terminal:assess-command-risk', { command });
    return result?.risk ?? { level: 'low', blocked: false, requiresOptIn: false, reasons: [] };
  }

  async function runCommand(command) {
    const nextCommand = String(command ?? '').trim();
    const tab = getActiveTab();
    const cwd = tab?.cwd ?? '';
    if (!nextCommand || tab?.isRunning) return;
    if (!cwd) {
      appendOutput(`${strings.terminal.noDirectory}\n`);
      return;
    }

    // ── cd is stateful — handle it here, not in the subprocess ────────────────
    const cdMatch = nextCommand.match(/^cd(?:\s+(.*))?$/);
    if (cdMatch) {
      const target = (cdMatch[1] ?? '').trim();
      appendOutput(`${nextCommand}\n`);
      if (tab.commandHistory[tab.commandHistory.length - 1] !== nextCommand) {
        tab.commandHistory.push(nextCommand);
      }
      tab.historyIndex = -1;
      tab.currentInput = '';
      const result = await invokeIpc('terminal:resolve-directory', { cwd, target });
      if (result?.ok) {
        syncCwd(result.cwd);
        setStatus(strings.terminal.idle);
      } else {
        appendOutput(`${result?.error || 'cd: no such file or directory'}\n`);
        setStatus(result?.error || 'Error', 'warning');
      }
      return;
    }

    if (tab.commandHistory[tab.commandHistory.length - 1] !== nextCommand) {
      tab.commandHistory.push(nextCommand);
    }
    tab.historyIndex = -1;
    tab.currentInput = '';

    appendOutput(`${nextCommand}\n`);
    setRunning(true);
    setStatus(strings.terminal.running, 'running');

    const risk = await assessCommand(nextCommand);
    if (risk.blocked) {
      setRunning(false);
      setStatus(strings.terminal.criticalRisk, 'danger');
      appendOutput(`${strings.terminal.criticalRisk}\n`);
      return;
    }

    try {
      const result = await invokeIpc('terminal:spawn-command', {
        command: nextCommand,
        cwd,
        allowRisky: false,
      });

      if (!result?.ok) {
        tab.activeProcessId = null;
        setRunning(false);
        setStatus(
          result?.error ?? strings.terminal.defaultError,
          result?.risk?.blocked ? 'danger' : 'warning',
        );
        appendOutput(`${result?.error ?? strings.terminal.defaultError}\n`);
        return;
      }

      tab.activeProcessId = result.processId;
    } catch (error) {
      tab.activeProcessId = null;
      setRunning(false);
      setStatus(error?.message ?? strings.terminal.defaultError, 'danger');
      appendOutput(`${error?.message ?? strings.terminal.defaultError}\n`);
    }
  }

  async function stopCommand() {
    const tab = getActiveTab();
    if (!tab?.activeProcessId) return;
    const processId = tab.activeProcessId;
    tab.activeProcessId = null;
    await invokeIpc('terminal:kill', processId).catch(() => {});
    setRunning(false);
    setStatus(strings.terminal.stopped, 'warning');
    appendOutput(`\n${strings.terminal.processStopped}\n`);
  }

  function wireProcessEvents() {
    onIpc('terminal:process-output', (payload) => {
      if (!payload?.processId) return;
      const tabIndex = tabs.findIndex((tab) => tab.activeProcessId === payload.processId);
      if (tabIndex < 0) return;
      appendOutputForTab(tabIndex, payload.text);
    });

    onIpc('terminal:process-exit', (payload) => {
      if (!payload?.processId) return;
      const tabIndex = tabs.findIndex((tab) => tab.activeProcessId === payload.processId);
      if (tabIndex < 0) return;
      const tab = tabs[tabIndex];
      const code = payload.code ?? 0;
      tab.activeProcessId = null;
      tab.isRunning = false;
      appendOutputForTab(
        tabIndex,
        `${formatText(strings.terminal.processExited, { code: String(code) })}\n`,
      );
      if (tabIndex === activeTabIndex) {
        setRunning(false);
        setStatus(strings.terminal.finished, code === 0 ? 'success' : 'danger');
      }
    });
  }

  function positionInitial() {
    if (!panelRef) return;
    const panelWidth = panelRef.offsetWidth;
    const panelHeight = panelRef.offsetHeight;
    const left = Math.max(38, Math.round((window.innerWidth - panelWidth) / 2));
    const top = Math.max(8, window.innerHeight - 142 - panelHeight);
    panelRef.style.left = `${left}px`;
    panelRef.style.top = `${top}px`;
  }

  function setOpen(nextOpen) {
    isOpen = Boolean(nextOpen);
    if (panelRef) panelRef.hidden = !isOpen;
    onOpenChange?.(isOpen);
    if (isOpen) {
      if (!getActiveTab()?.cwd) void loadDefaultCwd();
      requestAnimationFrame(() => {
        if (!panelRef.style.left) positionInitial();
        inputEl?.focus();
      });
    }
  }

  function build() {
    if (panelRef) return panelRef;

    const panel = createElement('aside', 'chat-terminal-drawer');
    panel.hidden = true;

    // ── Header ───────────────────────────────────────────────────────────
    const header = createElement('div', 'chat-terminal-drawer__header');

    const headerCopy = createElement('div', 'chat-terminal-drawer__header-copy');
    headerCopy.append(createElement('h2', 'chat-terminal-drawer__title', strings.terminal.title));

    const headerActions = createElement('div', 'chat-terminal-drawer__header-actions');
    statusText = createElement('span', 'chat-terminal-drawer__status', strings.terminal.idle);

    const copyButton = createElement(
      'button',
      'chat-terminal-drawer__output-button',
      strings.terminal.copy,
    );
    copyButton.type = 'button';
    copyButton.addEventListener('click', () => {
      navigator.clipboard
        .writeText(getActiveTab()?.outputValue ?? '')
        .then(() => {
          copyButton.textContent = strings.terminal.copied;
          setTimeout(() => {
            copyButton.textContent = strings.terminal.copy;
          }, 1200);
        })
        .catch(() => {});
    });

    const clearButton = createElement(
      'button',
      'chat-terminal-drawer__output-button',
      strings.terminal.clear,
    );
    clearButton.type = 'button';
    clearButton.addEventListener('click', () => {
      replaceOutput('');
      setStatus(strings.terminal.idle);
    });

    const closeButton = createElement('button', 'chat-terminal-drawer__close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', strings.terminal.close);
    closeButton.append(createIcon('close', 'chat-terminal-drawer__close-icon'));
    closeButton.addEventListener('click', () => setOpen(false));

    headerActions.append(statusText, copyButton, clearButton, closeButton);
    header.append(headerCopy, headerActions);

    // ── Output area ──────────────────────────────────────────────────────
    outputEl = createElement('pre', 'chat-terminal-drawer__output');
    outputEl.textContent = '';

    // ── Command input row ────────────────────────────────────────────────
    const inputRow = createElement('div', 'chat-terminal-drawer__input-row');
    promptEl = createElement('span', 'chat-terminal-drawer__prompt', '>');

    inputEl = createElement('input', 'chat-terminal-drawer__cmd-input');
    inputEl.type = 'text';
    inputEl.spellcheck = false;
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('autocorrect', 'off');
    inputEl.setAttribute('autocapitalize', 'off');

    inputEl.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        const command = inputEl.value.trim();
        const tab = getActiveTab();
        inputEl.value = '';
        if (tab) {
          tab.currentInput = '';
          tab.historyIndex = -1;
        }
        if (command) void runCommand(command);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const tab = getActiveTab();
        if (!tab || tab.commandHistory.length === 0) return;
        if (tab.historyIndex === -1) {
          tab.currentInput = inputEl.value;
          tab.historyIndex = tab.commandHistory.length - 1;
        } else if (tab.historyIndex > 0) {
          tab.historyIndex -= 1;
        }
        inputEl.value = tab.commandHistory[tab.historyIndex] ?? '';
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const tab = getActiveTab();
        if (!tab || tab.historyIndex === -1) return;
        if (tab.historyIndex < tab.commandHistory.length - 1) {
          tab.historyIndex += 1;
          inputEl.value = tab.commandHistory[tab.historyIndex];
        } else {
          tab.historyIndex = -1;
          inputEl.value = tab.currentInput;
        }
      } else if (event.key === 'c' && event.ctrlKey && getActiveTab()?.isRunning) {
        event.preventDefault();
        void stopCommand();
      }
    });

    inputRow.append(promptEl, inputEl);
    panel.append(header, outputEl, inputRow);
    panelRef = panel;

    // ── Drag ─────────────────────────────────────────────────────────────────
    let dragActive = false;
    let dragOriginX = 0;
    let dragOriginY = 0;
    let dragStartLeft = 0;
    let dragStartTop = 0;

    function onDragStart(event) {
      if (event.button !== 0 || event.target.closest('button')) return;
      dragActive = true;
      dragOriginX = event.clientX;
      dragOriginY = event.clientY;
      dragStartLeft = parseInt(panel.style.left, 10) || 0;
      dragStartTop = parseInt(panel.style.top, 10) || 0;
      panel.classList.add('chat-terminal-drawer--dragging');
      event.preventDefault();
    }

    function onDragMove(event) {
      if (!dragActive) return;
      const dx = event.clientX - dragOriginX;
      const dy = event.clientY - dragOriginY;
      const maxLeft = window.innerWidth - panel.offsetWidth;
      const maxTop = window.innerHeight - panel.offsetHeight;
      panel.style.left = `${Math.max(0, Math.min(maxLeft, dragStartLeft + dx))}px`;
      panel.style.top = `${Math.max(0, Math.min(maxTop, dragStartTop + dy))}px`;
    }

    function onDragEnd() {
      if (!dragActive) return;
      dragActive = false;
      panel.classList.remove('chat-terminal-drawer--dragging');
    }

    header.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    // ── Resize ───────────────────────────────────────────────────────────────────
    const resizeHandle = createElement('div', 'chat-terminal-drawer__resize');
    panel.append(resizeHandle);

    let resizeActive = false;
    let resizeOriginX = 0;
    let resizeOriginY = 0;
    let resizeStartW = 0;
    let resizeStartOutputH = 0;

    function onResizeStart(event) {
      if (event.button !== 0) return;
      resizeActive = true;
      resizeOriginX = event.clientX;
      resizeOriginY = event.clientY;
      resizeStartW = panel.offsetWidth;
      resizeStartOutputH = outputEl ? outputEl.offsetHeight : 200;
      panel.classList.add('chat-terminal-drawer--resizing');
      event.preventDefault();
      event.stopPropagation();
    }

    function onResizeMove(event) {
      if (!resizeActive) return;
      const dx = event.clientX - resizeOriginX;
      const dy = event.clientY - resizeOriginY;
      const newW = Math.max(340, Math.min(window.innerWidth - 100, resizeStartW + dx));
      const newOutputH = Math.max(80, Math.min(window.innerHeight - 260, resizeStartOutputH + dy));
      panel.style.width = `${newW}px`;
      if (outputEl) outputEl.style.height = `${newOutputH}px`;
    }

    function onResizeEnd() {
      if (!resizeActive) return;
      resizeActive = false;
      panel.classList.remove('chat-terminal-drawer--resizing');
    }

    resizeHandle.addEventListener('mousedown', onResizeStart);
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);

    wireProcessEvents();
    void loadDefaultCwd();
    return panel;
  }

  return {
    build,
    toggle() {
      setOpen(!isOpen);
    },
    setOpen,
    isOpen() {
      return isOpen;
    },
  };
}

// ---------------------------------------------------------------------------

export function formatTerminalResultForModel(strings, action, result) {
  return formatRendererTerminalResultForModel(action, result, {
    resultHeader: strings.terminal.resultHeader,
    getToolLabel: (tool) => getTerminalToolLabel(strings, tool),
    formatExitCode: (code) => formatText(strings.terminal.exitCode, { code: String(code) }),
    errorLabel: strings.terminal.errorLabel,
  });
}
