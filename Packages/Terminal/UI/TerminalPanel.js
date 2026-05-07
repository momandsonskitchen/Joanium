import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createCheckbox } from '../../Shared/Checkbox/Checkbox.js';
import { createIcon } from '../../Shared/Icons/Icons.js';

const OUTPUT_LIMIT = 160_000;

function trimOutput(text) {
  return text.length > OUTPUT_LIMIT ? text.slice(text.length - OUTPUT_LIMIT) : text;
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

export function createTerminalPanel(strings) {
  let panelRef = null;
  let cwd = '';
  let commandValue = '';
  let activeProcessId = null;
  let outputValue = '';
  let allowRisky = false;

  let cwdInput = null;
  let commandInput = null;
  let statusText = null;
  let outputEl = null;
  let runButton = null;
  let stopButton = null;

  function setStatus(text, tone = '') {
    if (!statusText) return;
    statusText.textContent = text;
    statusText.className = `chat-terminal__status-text${tone ? ` chat-terminal__status-text--${tone}` : ''}`;
  }

  function syncCwd(nextCwd) {
    cwd = nextCwd || cwd;
    if (cwdInput) {
      cwdInput.value = cwd;
    }
  }

  function appendOutput(text) {
    outputValue = trimOutput(outputValue + String(text ?? ''));
    if (outputEl) {
      outputEl.textContent = outputValue || strings.emptyOutput;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  function replaceOutput(text) {
    outputValue = String(text ?? '');
    if (outputEl) {
      outputEl.textContent = outputValue || strings.emptyOutput;
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  function setRunning(isRunning) {
    if (runButton) runButton.disabled = isRunning;
    if (stopButton) stopButton.disabled = !isRunning;
    commandInput?.toggleAttribute('disabled', isRunning);
  }

  async function loadDefaultCwd() {
    try {
      const result = await invokeIpc('terminal:get-default-cwd');
      if (result?.ok) {
        syncCwd(result.cwd);
      }
    } catch {
      setStatus(strings.ready);
    }
  }

  async function chooseDirectory() {
    const result = await invokeIpc('terminal:select-directory', { defaultPath: cwd });
    if (result?.ok) {
      syncCwd(result.path);
    }
  }

  async function assessCommand(command) {
    const result = await invokeIpc('terminal:assess-command-risk', { command });
    return result?.risk ?? { level: 'low', blocked: false, requiresOptIn: false, reasons: [] };
  }

  async function runCommand(command) {
    const nextCommand = String(command ?? commandValue).trim();
    if (!nextCommand) {
      setStatus(strings.noCommand, 'warning');
      return;
    }
    if (!cwd) {
      setStatus(strings.noDirectory, 'warning');
      return;
    }

    const risk = await assessCommand(nextCommand);
    if (risk.blocked) {
      setStatus(strings.criticalRisk, 'danger');
      appendOutput(`\n${strings.criticalRisk}\n`);
      return;
    }
    if (risk.requiresOptIn && !allowRisky) {
      setStatus(strings.highRisk, 'warning');
      appendOutput(`\n${formatText(strings.riskReasons, { reasons: risk.reasons.join(' ') })}\n`);
      return;
    }

    replaceOutput(`$ ${nextCommand}\n`);
    setRunning(true);
    setStatus(strings.running, 'running');

    try {
      const result = await invokeIpc('terminal:spawn-command', {
        command: nextCommand,
        cwd,
        allowRisky
      });

      if (!result?.ok) {
        setRunning(false);
        activeProcessId = null;
        setStatus(result?.error ?? strings.defaultError, result?.risk?.blocked ? 'danger' : 'warning');
        appendOutput(`\n${result?.error ?? strings.defaultError}\n`);
        return;
      }

      activeProcessId = result.processId;
      setStatus(`${strings.processStarted}: ${result.processId}`, 'running');
    } catch (error) {
      setRunning(false);
      activeProcessId = null;
      setStatus(error?.message ?? strings.defaultError, 'danger');
      appendOutput(`\n${error?.message ?? strings.defaultError}\n`);
    }
  }

  async function stopCommand() {
    if (!activeProcessId) return;
    const processId = activeProcessId;
    activeProcessId = null;
    await invokeIpc('terminal:kill', processId).catch(() => {});
    setRunning(false);
    setStatus(strings.stopped, 'warning');
    appendOutput(`\n${strings.processStopped}\n`);
  }

  async function inspectWorkspace() {
    if (!cwd) {
      setStatus(strings.noDirectory, 'warning');
      return;
    }

    replaceOutput('');
    setStatus(strings.running, 'running');
    try {
      const result = await invokeIpc('terminal:inspect-workspace', { rootPath: cwd });
      if (!result?.ok) {
        setStatus(result?.error ?? strings.inspectFailed, 'danger');
        replaceOutput(result?.error ?? strings.inspectFailed);
        return;
      }
      replaceOutput(formatJson(result.summary));
      setStatus(strings.finished, 'success');
    } catch (error) {
      setStatus(error?.message ?? strings.inspectFailed, 'danger');
      replaceOutput(error?.message ?? strings.inspectFailed);
    }
  }

  function buildQuickButton(label, command) {
    const button = createElement('button', 'chat-terminal__quick-btn');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      commandValue = command;
      if (commandInput) commandInput.value = commandValue;
      void runCommand(command);
    });
    return button;
  }

  function wireProcessEvents() {
    onIpc('terminal:process-output', (payload) => {
      if (!payload || payload.processId !== activeProcessId) return;
      appendOutput(payload.text);
    });

    onIpc('terminal:process-exit', (payload) => {
      if (!payload || payload.processId !== activeProcessId) return;
      const code = payload.code ?? 0;
      activeProcessId = null;
      setRunning(false);
      appendOutput(`\n${formatText(strings.processExited, { code })}\n`);
      setStatus(strings.finished, code === 0 ? 'success' : 'danger');
    });
  }

  function build() {
    if (panelRef) {
      return panelRef;
    }

    const panel = createElement('div', 'chat-terminal');
    panel.hidden = true;

    const header = createElement('div', 'chat-terminal__header');
    const headerCopy = createElement('div', 'chat-terminal__header-copy');
    headerCopy.append(
      createElement('h2', 'chat-terminal__title', strings.title),
      createElement('p', 'chat-terminal__subtitle', strings.subtitle)
    );
    header.append(headerCopy);

    const body = createElement('div', 'chat-terminal__body');
    const controls = createElement('section', 'chat-terminal__controls');
    const outputPane = createElement('section', 'chat-terminal__output-pane');

    const cwdGroup = createElement('label', 'chat-terminal__field');
    cwdGroup.append(createElement('span', 'chat-terminal__field-label', strings.cwdLabel));
    const cwdRow = createElement('div', 'chat-terminal__cwd-row');
    cwdInput = createElement('input', 'chat-terminal__input');
    cwdInput.type = 'text';
    cwdInput.setAttribute('aria-label', strings.cwdLabel);
    cwdInput.addEventListener('input', () => {
      cwd = cwdInput.value;
    });
    const chooseButton = createElement('button', 'chat-terminal__icon-btn');
    chooseButton.type = 'button';
    chooseButton.setAttribute('aria-label', strings.chooseDirectory);
    chooseButton.append(createIcon('folderOpen', 'chat-terminal__icon'));
    chooseButton.addEventListener('click', () => { void chooseDirectory(); });
    cwdRow.append(cwdInput, chooseButton);
    cwdGroup.append(cwdRow);

    const commandGroup = createElement('label', 'chat-terminal__field');
    commandGroup.append(createElement('span', 'chat-terminal__field-label', strings.commandLabel));
    commandInput = createElement('textarea', 'chat-terminal__command');
    commandInput.rows = 4;
    commandInput.placeholder = strings.commandPlaceholder;
    commandInput.setAttribute('aria-label', strings.commandLabel);
    commandInput.addEventListener('input', () => {
      commandValue = commandInput.value;
    });
    commandInput.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void runCommand();
      }
    });
    commandGroup.append(commandInput);

    const riskyToggle = createCheckbox({
      label: strings.allowRisky,
      description: strings.allowRiskyDescription,
      checked: allowRisky,
      onChange: (checked) => {
        allowRisky = checked;
      }
    });

    const actions = createElement('div', 'chat-terminal__actions');
    runButton = createElement('button', 'chat-terminal__run-btn');
    runButton.type = 'button';
    runButton.append(createIcon('play', 'chat-terminal__button-icon'), createElement('span', '', strings.run));
    runButton.addEventListener('click', () => { void runCommand(); });

    stopButton = createElement('button', 'chat-terminal__stop-btn');
    stopButton.type = 'button';
    stopButton.disabled = true;
    stopButton.append(createIcon('stop', 'chat-terminal__button-icon'), createElement('span', '', strings.stop));
    stopButton.addEventListener('click', () => { void stopCommand(); });

    actions.append(runButton, stopButton);

    const quick = createElement('div', 'chat-terminal__quick');
    quick.append(
      createElement('p', 'chat-terminal__quick-label', strings.quickCommands),
      buildQuickButton(strings.gitStatus, 'git status --short --branch'),
      buildQuickButton(strings.gitDiff, 'git diff --stat --patch --minimal --color=never'),
      buildQuickButton(strings.runChecks, 'npm test')
    );

    const inspectButton = createElement('button', 'chat-terminal__secondary-btn');
    inspectButton.type = 'button';
    inspectButton.append(createIcon('terminal', 'chat-terminal__button-icon'), createElement('span', '', strings.inspect));
    inspectButton.addEventListener('click', () => { void inspectWorkspace(); });

    controls.append(cwdGroup, commandGroup, riskyToggle.element, actions, inspectButton, quick);

    const outputHeader = createElement('div', 'chat-terminal__output-header');
    statusText = createElement('span', 'chat-terminal__status-text', strings.idle);
    const outputActions = createElement('div', 'chat-terminal__output-actions');

    const copyButton = createElement('button', 'chat-terminal__output-btn');
    copyButton.type = 'button';
    copyButton.textContent = strings.copy;
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(outputValue).then(() => {
        copyButton.textContent = strings.copied;
        setTimeout(() => {
          copyButton.textContent = strings.copy;
        }, 1200);
      }).catch(() => {});
    });

    const clearButton = createElement('button', 'chat-terminal__output-btn');
    clearButton.type = 'button';
    clearButton.textContent = strings.clear;
    clearButton.addEventListener('click', () => {
      replaceOutput('');
      setStatus(strings.idle);
    });

    outputActions.append(copyButton, clearButton);
    outputHeader.append(statusText, outputActions);

    outputEl = createElement('pre', 'chat-terminal__output', strings.emptyOutput);
    outputPane.append(outputHeader, outputEl);
    body.append(controls, outputPane);
    panel.append(header, body);

    panelRef = panel;
    wireProcessEvents();
    void loadDefaultCwd();
    return panel;
  }

  return {
    build,
    onShow: () => {
      if (!cwd) {
        void loadDefaultCwd();
      }
      setStatus(activeProcessId ? strings.running : strings.idle, activeProcessId ? 'running' : '');
    }
  };
}
