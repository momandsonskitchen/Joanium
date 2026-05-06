import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';

function createServerId(name) {
  const stem = String(name || 'mcp-server')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'mcp-server';
  return `${stem}-${Math.random().toString(36).slice(2, 8)}`;
}

function createField(label, placeholder, { multiline = false } = {}) {
  const wrap = createElement('label', 'mcp-field');
  const labelEl = createElement('span', 'mcp-field__label', label);
  const input = multiline ? document.createElement('textarea') : document.createElement('input');
  input.className = multiline ? 'mcp-field__textarea' : 'mcp-field__input';
  input.placeholder = placeholder ?? '';
  if (multiline) input.rows = 3;
  input.spellcheck = false;
  input.autocomplete = 'off';
  wrap.append(labelEl, input);
  return { wrap, input };
}

export function createMCPPanel(strings) {
  const panel = createElement('div', 'mcp-panel');
  let editingId = null;
  let listEl = null;
  let toolsEl = null;
  let feedbackEl = null;
  let transport = 'stdio';
  let serverCache = [];

  const nameField = createField(strings.form.name, strings.form.namePlaceholder);
  const descriptionField = createField(strings.form.description, strings.form.descriptionPlaceholder);
  const commandField = createField(strings.form.command, strings.form.commandPlaceholder);
  const argsField = createField(strings.form.args, strings.form.argsPlaceholder);
  const envField = createField(strings.form.env, strings.form.envPlaceholder, { multiline: true });
  const urlField = createField(strings.form.url, strings.form.urlPlaceholder);

  function parseArgs(value) {
    return collapseWhitespace(value)
      .split(' ')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseEnv(value) {
    const raw = value.trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(strings.feedback.invalidEnv);
    }
    return parsed;
  }

  function syncTransportFields() {
    commandField.wrap.hidden = transport !== 'stdio';
    argsField.wrap.hidden = transport !== 'stdio';
    envField.wrap.hidden = transport !== 'stdio';
    urlField.wrap.hidden = transport !== 'http';
  }

  function resetForm() {
    editingId = null;
    transport = 'stdio';
    for (const input of [
      nameField.input,
      descriptionField.input,
      commandField.input,
      argsField.input,
      envField.input,
      urlField.input
    ]) {
      input.value = '';
    }
    syncTransportButtons();
    syncTransportFields();
    feedbackEl.hidden = true;
  }

  function applyServerToForm(server) {
    editingId = server.id;
    transport = server.transport ?? 'stdio';
    nameField.input.value = server.name ?? '';
    descriptionField.input.value = server.description ?? '';
    commandField.input.value = server.command ?? '';
    argsField.input.value = (server.args ?? []).join(' ');
    envField.input.value = server.env && Object.keys(server.env).length
      ? JSON.stringify(server.env, null, 2)
      : '';
    urlField.input.value = server.url ?? '';
    syncTransportButtons();
    syncTransportFields();
    nameField.input.focus();
  }

  let stdioButton = null;
  let httpButton = null;
  function syncTransportButtons() {
    stdioButton?.classList.toggle('mcp-segmented__button--active', transport === 'stdio');
    httpButton?.classList.toggle('mcp-segmented__button--active', transport === 'http');
  }

  async function saveServer() {
    const name = collapseWhitespace(nameField.input.value) || strings.form.namePlaceholder;

    try {
      const payload = {
        id: editingId ?? createServerId(name),
        name,
        description: collapseWhitespace(descriptionField.input.value),
        transport,
        enabled: false,
        command: collapseWhitespace(commandField.input.value),
        args: parseArgs(argsField.input.value),
        env: parseEnv(envField.input.value),
        url: collapseWhitespace(urlField.input.value)
      };

      await invokeIpc('mcp:save-server', payload);
      feedbackEl.textContent = strings.feedback.saved;
      feedbackEl.hidden = false;
      resetForm();
      await populate();
    } catch (error) {
      feedbackEl.textContent = error?.message ?? strings.feedback.saveFailed;
      feedbackEl.hidden = false;
    }
  }

  function renderServer(server) {
    const card = createElement('article', 'mcp-server');
    const header = createElement('div', 'mcp-server__header');
    const icon = createElement('span', 'mcp-server__icon');
    icon.append(createIcon('network', 'mcp-server__icon-svg'));
    const copy = createElement('div', 'mcp-server__copy');
    copy.append(
      createElement('h4', 'mcp-server__name', server.name),
      createElement('p', 'mcp-server__description', server.description || server.command || server.url || '')
    );
    const badge = createElement(
      'span',
      `mcp-server__status ${server.connected ? 'mcp-server__status--connected' : ''}`,
      server.connected ? strings.list.connected : strings.list.disconnected
    );
    header.append(icon, copy, badge);

    const meta = createElement('div', 'mcp-server__meta');
    meta.append(
      createElement('span', 'mcp-server__meta-item', server.transport.toUpperCase()),
      createElement('span', 'mcp-server__meta-item', formatText(strings.list.tools, {
        count: String(server.toolCount ?? 0)
      }))
    );

    const actions = createElement('div', 'mcp-server__actions');
    const connectButton = createElement(
      'button',
      'mcp-server__button',
      server.connected ? strings.list.disconnect : strings.list.connect
    );
    connectButton.type = 'button';
    connectButton.addEventListener('click', async () => {
      try {
        if (server.connected) {
          await invokeIpc('mcp:disconnect-server', server.id);
        } else {
          await invokeIpc('mcp:connect-server', server.id);
        }
        await populate();
      } catch (error) {
        feedbackEl.textContent = error?.message ?? strings.feedback.connectFailed;
        feedbackEl.hidden = false;
      }
    });

    const editButton = createElement('button', 'mcp-server__icon-button');
    editButton.type = 'button';
    editButton.setAttribute('aria-label', strings.list.edit);
    editButton.append(createIcon('pencil', 'mcp-server__button-icon'));
    editButton.addEventListener('click', () => applyServerToForm(server));

    const deleteButton = createElement('button', 'mcp-server__icon-button mcp-server__icon-button--danger');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', strings.list.delete);
    deleteButton.append(createIcon('trash', 'mcp-server__button-icon'));
    deleteButton.addEventListener('click', async () => {
      await invokeIpc('mcp:remove-server', server.id);
      if (editingId === server.id) resetForm();
      await populate();
    });

    actions.append(connectButton, editButton, deleteButton);
    card.append(header, meta, actions);
    return card;
  }

  function renderTools(tools) {
    toolsEl.replaceChildren();

    if (!tools.length) {
      toolsEl.append(createElement('div', 'mcp-tools__empty', strings.tools.empty));
      return;
    }

    for (const tool of tools) {
      const item = createElement('article', 'mcp-tool');
      item.append(
        createElement('div', 'mcp-tool__name', tool.name),
        createElement('div', 'mcp-tool__server', tool.serverName ?? ''),
        createElement('p', 'mcp-tool__description', tool.description ?? '')
      );
      toolsEl.append(item);
    }
  }

  async function populate() {
    serverCache = await invokeIpc('mcp:list-servers').catch(() => []);
    const tools = await invokeIpc('mcp:list-tools').catch(() => []);
    listEl.replaceChildren();

    if (!serverCache.length) {
      listEl.append(createElement('div', 'mcp-list__empty', strings.list.empty));
    } else {
      for (const server of serverCache) {
        listEl.append(renderServer(server));
      }
    }

    renderTools(Array.isArray(tools) ? tools : []);
  }

  const header = createElement('div', 'mcp-panel__header');
  header.append(
    createElement('h3', 'mcp-panel__title', strings.title),
    createElement('p', 'mcp-panel__subtitle', strings.subtitle)
  );

  const body = createElement('div', 'mcp-panel__body');
  const form = createElement('section', 'mcp-form');
  form.append(createElement('div', 'mcp-form__title', strings.form.newServer));

  const transportControls = createElement('div', 'mcp-segmented');
  stdioButton = createElement('button', 'mcp-segmented__button mcp-segmented__button--active', strings.form.stdio);
  httpButton = createElement('button', 'mcp-segmented__button', strings.form.http);
  stdioButton.type = 'button';
  httpButton.type = 'button';
  stdioButton.addEventListener('click', () => {
    transport = 'stdio';
    syncTransportButtons();
    syncTransportFields();
  });
  httpButton.addEventListener('click', () => {
    transport = 'http';
    syncTransportButtons();
    syncTransportFields();
  });
  transportControls.append(stdioButton, httpButton);

  const actionRow = createElement('div', 'mcp-form__actions');
  const resetButton = createElement('button', 'mcp-form__secondary', strings.form.reset);
  const saveButton = createElement('button', 'mcp-form__primary', strings.form.save);
  resetButton.type = 'button';
  saveButton.type = 'button';
  resetButton.addEventListener('click', resetForm);
  saveButton.addEventListener('click', () => {
    void saveServer();
  });
  actionRow.append(resetButton, saveButton);

  feedbackEl = createElement('div', 'mcp-form__feedback');
  feedbackEl.hidden = true;
  feedbackEl.setAttribute('aria-live', 'polite');

  form.append(
    nameField.wrap,
    descriptionField.wrap,
    createElement('div', 'mcp-field__label', strings.form.transport),
    transportControls,
    commandField.wrap,
    argsField.wrap,
    envField.wrap,
    urlField.wrap,
    actionRow,
    feedbackEl
  );

  const content = createElement('section', 'mcp-content');
  const listHeader = createElement('div', 'mcp-content__header');
  listHeader.append(createElement('h4', 'mcp-content__title', strings.list.title));
  listEl = createElement('div', 'mcp-list');

  const toolsHeader = createElement('div', 'mcp-content__header mcp-content__header--tools');
  const refreshTools = createElement('button', 'mcp-content__refresh');
  refreshTools.type = 'button';
  refreshTools.setAttribute('aria-label', strings.tools.refresh);
  refreshTools.append(createIcon('retry', 'mcp-content__refresh-icon'));
  refreshTools.addEventListener('click', () => {
    void populate();
  });
  toolsHeader.append(createElement('h4', 'mcp-content__title', strings.tools.title), refreshTools);
  toolsEl = createElement('div', 'mcp-tools');

  content.append(listHeader, listEl, toolsHeader, toolsEl);
  body.append(form, content);
  panel.append(header, body);
  syncTransportFields();
  void populate();

  return panel;
}
