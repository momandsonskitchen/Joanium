import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';

const CHANNEL_ORDER = ['telegram', 'whatsapp', 'discord', 'slack'];

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function createField({ label, placeholder, type = 'text', multiline = false }) {
  const wrap = createElement('label', 'channels-field');
  const labelEl = createElement('span', 'channels-field__label', label);
  const input = multiline ? document.createElement('textarea') : document.createElement('input');

  input.className = multiline ? 'channels-field__textarea' : 'channels-field__input';
  input.placeholder = placeholder ?? '';
  if (!multiline) input.type = type;
  if (multiline) input.rows = 3;
  input.autocomplete = 'off';
  input.spellcheck = false;

  wrap.append(labelEl, input);
  return { wrap, input };
}

function createSecretField({ label, placeholder, strings }) {
  const field = createField({ label, placeholder, type: 'password' });
  const holder = createElement('div', 'channels-field__secret');
  const toggle = createElement('button', 'channels-field__secret-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', strings.common.show);
  toggle.append(createIcon('eye', 'channels-field__secret-icon'));
  field.input.classList.add('channels-field__input--secret');

  toggle.addEventListener('click', () => {
    const isHidden = field.input.type === 'password';
    field.input.type = isHidden ? 'text' : 'password';
    toggle.setAttribute('aria-label', isHidden ? strings.common.hide : strings.common.show);
  });

  field.input.remove();
  holder.append(field.input, toggle);
  field.wrap.append(holder);
  return field;
}

function getChannelTone(channelName) {
  return {
    telegram: 'blue',
    whatsapp: 'green',
    discord: 'indigo',
    slack: 'rose'
  }[channelName] ?? 'neutral';
}

function getChannelInitial(channelName, strings) {
  return strings.channels[channelName].name.slice(0, 1).toUpperCase();
}

export function createChannelsPanel(strings) {
  let panel = null;
  let summaryActive = null;
  let summaryConfigured = null;
  let summaryTotal = null;
  let cardsWrap = null;
  let historyList = null;
  const cardRefs = new Map();

  function setFeedback(channelName, message, tone = 'info') {
    const refs = cardRefs.get(channelName);
    if (!refs?.feedback) return;
    refs.feedback.textContent = message;
    refs.feedback.className = `channels-card__feedback channels-card__feedback--${tone}`;
    refs.feedback.hidden = !message;
  }

  function setCardState(channelName, config) {
    const refs = cardRefs.get(channelName);
    if (!refs) return;

    const configured = Boolean(config?.configured);
    const enabled = Boolean(config?.enabled);
    refs.card.classList.toggle('channels-card--connected', configured);
    refs.card.classList.toggle('channels-card--paused', configured && !enabled);
    refs.status.textContent = configured
      ? (enabled ? strings.common.active : strings.common.paused)
      : strings.common.notConnected;
    refs.status.className = `channels-card__status ${configured && enabled ? 'channels-card__status--active' : ''}`;
    refs.toggle.checked = enabled;
    refs.toggle.disabled = !configured;
    refs.disconnect.hidden = !configured;
    refs.steps.hidden = configured;

    if (refs.secretFields.botToken && config?.botTokenSet) {
      refs.secretFields.botToken.placeholder = strings.common.savedSecret;
    } else if (refs.secretFields.botToken) {
      refs.secretFields.botToken.placeholder = refs.placeholders.botToken;
    }

    if (refs.secretFields.authToken && config?.authTokenSet) {
      refs.secretFields.authToken.placeholder = strings.common.savedSecret;
    } else if (refs.secretFields.authToken) {
      refs.secretFields.authToken.placeholder = refs.placeholders.authToken;
    }

    if (refs.secretFields.accountSid && config?.accountSidSet) {
      refs.secretFields.accountSid.placeholder = strings.common.savedSecret;
    } else if (refs.secretFields.accountSid) {
      refs.secretFields.accountSid.placeholder = refs.placeholders.accountSid;
    }

    if (refs.inputs.channelId && config?.channelId) {
      refs.inputs.channelId.value = config.channelId;
    }

    if (refs.inputs.fromNumber && config?.fromNumber) {
      refs.inputs.fromNumber.value = config.fromNumber;
    }

    if (refs.inputs.systemPrompt) {
      refs.inputs.systemPrompt.value = config?.systemPrompt ?? '';
    }
  }

  function getPayload(channelName) {
    const refs = cardRefs.get(channelName);
    const payload = {
      systemPrompt: refs.inputs.systemPrompt?.value.trim() ?? ''
    };

    if (channelName === 'telegram') {
      const botToken = refs.inputs.botToken.value.trim();
      if (botToken) payload.botToken = botToken;
    }

    if (channelName === 'whatsapp') {
      const accountSid = refs.inputs.accountSid.value.trim();
      const authToken = refs.inputs.authToken.value.trim();
      const fromNumber = refs.inputs.fromNumber.value.trim();
      if (accountSid) payload.accountSid = accountSid;
      if (authToken) payload.authToken = authToken;
      payload.fromNumber = fromNumber;
    }

    if (channelName === 'discord' || channelName === 'slack') {
      const botToken = refs.inputs.botToken.value.trim();
      const channelId = refs.inputs.channelId.value.trim();
      if (botToken) payload.botToken = botToken;
      payload.channelId = channelId;
    }

    return payload;
  }

  function hasSavedSecret(input) {
    return input.placeholder === strings.common.savedSecret;
  }

  function validateRequired(channelName) {
    const refs = cardRefs.get(channelName);

    if (channelName === 'telegram') {
      if (!refs.inputs.botToken.value.trim() && !hasSavedSecret(refs.inputs.botToken)) {
        refs.inputs.botToken.focus();
        return false;
      }
    }

    if (channelName === 'whatsapp') {
      if (!refs.inputs.accountSid.value.trim() && !hasSavedSecret(refs.inputs.accountSid)) {
        refs.inputs.accountSid.focus();
        return false;
      }
      if (!refs.inputs.authToken.value.trim() && !hasSavedSecret(refs.inputs.authToken)) {
        refs.inputs.authToken.focus();
        return false;
      }
      if (!refs.inputs.fromNumber.value.trim()) {
        refs.inputs.fromNumber.focus();
        return false;
      }
    }

    if (channelName === 'discord' || channelName === 'slack') {
      if (!refs.inputs.botToken.value.trim() && !hasSavedSecret(refs.inputs.botToken)) {
        refs.inputs.botToken.focus();
        return false;
      }
      if (!refs.inputs.channelId.value.trim()) {
        refs.inputs.channelId.focus();
        return false;
      }
    }

    return true;
  }

  async function validateChannel(channelName, payload) {
    if (channelName === 'telegram' && payload.botToken) {
      const result = await invokeIpc('channels:validate', channelName, { botToken: payload.botToken });
      setFeedback(channelName, formatText(strings.feedback.tokenVerified, {
        value: result.username ? `@${result.username}` : strings.channels.telegram.name
      }), 'success');
    }

    if (channelName === 'whatsapp' && payload.accountSid && payload.authToken) {
      const result = await invokeIpc('channels:validate', channelName, {
        accountSid: payload.accountSid,
        authToken: payload.authToken
      });
      setFeedback(channelName, formatText(strings.feedback.accountVerified, {
        value: result.friendlyName ?? strings.channels.whatsapp.name
      }), 'success');
    }

    if (channelName === 'discord' && payload.botToken) {
      const result = await invokeIpc('channels:validate', channelName, { botToken: payload.botToken });
      setFeedback(channelName, formatText(strings.feedback.tokenVerified, {
        value: result.username ? `@${result.username}` : strings.channels.discord.name
      }), 'success');
    }

    if (channelName === 'slack' && payload.botToken) {
      const result = await invokeIpc('channels:validate', channelName, { botToken: payload.botToken });
      setFeedback(channelName, formatText(strings.feedback.slackVerified, {
        value: result.team || result.name || strings.channels.slack.name
      }), 'success');
    }
  }

  async function connectChannel(channelName) {
    const refs = cardRefs.get(channelName);
    if (!validateRequired(channelName)) {
      setFeedback(channelName, strings.common.required, 'error');
      return;
    }

    refs.connect.disabled = true;
    refs.connectLabel.textContent = strings.common.connecting;
    setFeedback(channelName, '', 'info');

    try {
      const payload = getPayload(channelName);
      await validateChannel(channelName, payload);
      const saved = await invokeIpc('channels:save', channelName, payload);
      setCardState(channelName, saved);
      if (refs.inputs.botToken) refs.inputs.botToken.value = '';
      if (refs.inputs.authToken) refs.inputs.authToken.value = '';
      if (refs.inputs.accountSid) refs.inputs.accountSid.value = '';
      setFeedback(channelName, strings.feedback[`${channelName}Connected`], 'success');
      await populate();
    } catch (error) {
      setFeedback(channelName, error?.message ?? strings.common.saveFailed, 'error');
    } finally {
      refs.connect.disabled = false;
      refs.connectLabel.textContent = strings.common.connect;
    }
  }

  async function disconnectChannel(channelName) {
    try {
      await invokeIpc('channels:remove', channelName);
      const config = await invokeIpc('channels:get', channelName);
      const refs = cardRefs.get(channelName);
      for (const input of Object.values(refs.inputs)) {
        input.value = '';
      }
      setCardState(channelName, config);
      setFeedback(channelName, strings.feedback.disconnected, 'info');
      await populate();
    } catch (error) {
      setFeedback(channelName, error?.message ?? strings.common.disconnectFailed, 'error');
    }
  }

  async function toggleChannel(channelName, enabled) {
    const refs = cardRefs.get(channelName);
    try {
      const config = await invokeIpc('channels:toggle', channelName, enabled);
      setCardState(channelName, config);
      setFeedback(channelName, enabled ? strings.feedback.enabled : strings.feedback.paused, 'success');
      await populate();
    } catch (error) {
      refs.toggle.checked = !enabled;
      setFeedback(channelName, error?.message ?? strings.common.toggleFailed, 'error');
    }
  }

  function createSetupSteps(channelName) {
    const steps = createElement('div', 'channels-card__steps');
    steps.append(createElement('div', 'channels-card__steps-title', strings.channels[channelName].setupTitle));

    const list = createElement('ol', 'channels-card__steps-list');
    for (const step of strings.channels[channelName].steps) {
      list.append(createElement('li', 'channels-card__step', step));
    }
    steps.append(list);
    return steps;
  }

  function createChannelCard(channelName) {
    const channelStrings = strings.channels[channelName];
    const card = createElement('article', `channels-card channels-card--${getChannelTone(channelName)}`);
    const header = createElement('div', 'channels-card__header');
    const badge = createElement('div', 'channels-card__badge', getChannelInitial(channelName, strings));
    const titleWrap = createElement('div', 'channels-card__title-wrap');
    const titleRow = createElement('div', 'channels-card__title-row');
    const status = createElement('span', 'channels-card__status', strings.common.notConnected);

    titleRow.append(createElement('h3', 'channels-card__title', channelStrings.name), status);
    titleWrap.append(titleRow, createElement('p', 'channels-card__summary', channelStrings.summary));

    const toggleWrap = createElement('label', 'channels-toggle');
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'channels-toggle__input';
    toggle.disabled = true;
    toggle.addEventListener('change', () => {
      void toggleChannel(channelName, toggle.checked);
    });
    toggleWrap.append(toggle, createElement('span', 'channels-toggle__track'));
    header.append(badge, titleWrap, toggleWrap);

    const steps = createSetupSteps(channelName);
    const form = createElement('div', 'channels-card__form');
    const inputs = {};
    const secretFields = {};
    const placeholders = {};

    if (channelName === 'telegram') {
      const botToken = createSecretField({
        label: strings.fields.botToken,
        placeholder: strings.placeholders.telegramToken,
        strings
      });
      inputs.botToken = botToken.input;
      secretFields.botToken = botToken.input;
      placeholders.botToken = strings.placeholders.telegramToken;
      form.append(botToken.wrap);
    }

    if (channelName === 'whatsapp') {
      const row = createElement('div', 'channels-card__field-row');
      const accountSid = createSecretField({
        label: strings.fields.accountSid,
        placeholder: strings.placeholders.whatsappSid,
        strings
      });
      const authToken = createSecretField({
        label: strings.fields.authToken,
        placeholder: strings.placeholders.whatsappToken,
        strings
      });
      const fromNumber = createField({
        label: strings.fields.sandboxNumber,
        placeholder: strings.placeholders.whatsappNumber
      });
      inputs.accountSid = accountSid.input;
      inputs.authToken = authToken.input;
      inputs.fromNumber = fromNumber.input;
      secretFields.accountSid = accountSid.input;
      secretFields.authToken = authToken.input;
      placeholders.accountSid = strings.placeholders.whatsappSid;
      placeholders.authToken = strings.placeholders.whatsappToken;
      row.append(accountSid.wrap, authToken.wrap);
      form.append(row, fromNumber.wrap);
      if (channelStrings.hint) {
        form.append(createElement('p', 'channels-card__hint', channelStrings.hint));
      }
    }

    if (channelName === 'discord' || channelName === 'slack') {
      const row = createElement('div', 'channels-card__field-row');
      const botToken = createSecretField({
        label: strings.fields.botToken,
        placeholder: channelName === 'discord'
          ? strings.placeholders.discordToken
          : strings.placeholders.slackToken,
        strings
      });
      const channelId = createField({
        label: strings.fields.channelId,
        placeholder: channelName === 'discord'
          ? strings.placeholders.discordChannel
          : strings.placeholders.slackChannel
      });
      inputs.botToken = botToken.input;
      inputs.channelId = channelId.input;
      secretFields.botToken = botToken.input;
      placeholders.botToken = channelName === 'discord'
        ? strings.placeholders.discordToken
        : strings.placeholders.slackToken;
      row.append(botToken.wrap, channelId.wrap);
      form.append(row);
    }

    const prompt = createField({
      label: strings.common.optionalPrompt,
      placeholder: strings.common.optionalPromptPlaceholder,
      multiline: true
    });
    inputs.systemPrompt = prompt.input;
    form.append(prompt.wrap);

    const actions = createElement('div', 'channels-card__actions');
    const disconnect = createElement('button', 'channels-card__secondary', strings.common.disconnect);
    const connect = createElement('button', 'channels-card__primary');
    const connectLabel = createElement('span', 'channels-card__primary-label', strings.common.connect);
    disconnect.type = 'button';
    connect.type = 'button';
    disconnect.hidden = true;
    disconnect.addEventListener('click', () => {
      void disconnectChannel(channelName);
    });
    connect.addEventListener('click', () => {
      void connectChannel(channelName);
    });
    connect.append(connectLabel);
    actions.append(disconnect, connect);

    const feedback = createElement('div', 'channels-card__feedback');
    feedback.hidden = true;
    feedback.setAttribute('aria-live', 'polite');

    card.append(header, steps, form, actions, feedback);
    cardRefs.set(channelName, {
      card,
      status,
      toggle,
      steps,
      inputs,
      secretFields,
      placeholders,
      connect,
      connectLabel,
      disconnect,
      feedback
    });
    return card;
  }

  function renderHistory(messages) {
    if (!historyList) return;
    historyList.replaceChildren();

    if (messages.length === 0) {
      const empty = createElement('div', 'channels-history__empty', strings.history.empty);
      historyList.append(empty);
      return;
    }

    for (const message of messages.slice(0, 40)) {
      const item = createElement('article', 'channels-history__item');
      const meta = createElement('div', 'channels-history__meta');
      const channelLabel = strings.channels[message.channel]?.name ?? message.channel;
      const status = createElement(
        'span',
        `channels-history__status channels-history__status--${message.status === 'error' ? 'error' : 'success'}`,
        message.status === 'error' ? strings.history.error : strings.history.success
      );
      meta.append(
        createElement('span', 'channels-history__channel', channelLabel),
        createElement('span', 'channels-history__from', message.from),
        createElement('span', 'channels-history__date', formatDate(message.repliedAt)),
        status
      );

      const incoming = createElement('p', 'channels-history__incoming', message.incoming);
      const reply = createElement('p', 'channels-history__reply', message.reply || message.error || '');
      const deleteButton = createElement('button', 'channels-history__delete');
      deleteButton.type = 'button';
      deleteButton.setAttribute('aria-label', strings.history.delete);
      deleteButton.append(createIcon('trash', 'channels-history__delete-icon'));
      deleteButton.addEventListener('click', async () => {
        await invokeIpc('channels:delete-message', message.id);
        await populate();
      });

      item.append(meta, incoming, reply, deleteButton);
      historyList.append(item);
    }
  }

  function updateSummary(channels) {
    const configs = Object.values(channels ?? {});
    const active = configs.filter((config) => config.configured && config.enabled).length;
    const configured = configs.filter((config) => config.configured).length;
    summaryActive.textContent = String(active);
    summaryConfigured.textContent = String(configured);
    summaryTotal.textContent = String(CHANNEL_ORDER.length);
  }

  async function populate() {
    const [channels, messages] = await Promise.all([
      invokeIpc('channels:list'),
      invokeIpc('channels:list-messages')
    ]);

    updateSummary(channels);
    for (const channelName of CHANNEL_ORDER) {
      setCardState(channelName, channels[channelName] ?? {});
    }
    renderHistory(Array.isArray(messages) ? messages : []);
  }

  function buildSummaryTile(label, valueClass) {
    const tile = createElement('div', 'channels-summary__tile');
    const value = createElement('strong', valueClass, '0');
    tile.append(value, createElement('span', 'channels-summary__label', label));
    return { tile, value };
  }

  function build() {
    panel = createElement('div', 'channels');
    panel.hidden = true;

    const header = createElement('div', 'channels__header');
    const headerText = createElement('div', 'channels__header-text');
    headerText.append(
      createElement('h2', 'channels__title', strings.title),
      createElement('p', 'channels__subtitle', strings.subtitle)
    );
    const summary = createElement('div', 'channels-summary');
    const activeTile = buildSummaryTile(strings.overview.active, 'channels-summary__value');
    const configuredTile = buildSummaryTile(strings.overview.configured, 'channels-summary__value');
    const totalTile = buildSummaryTile(strings.overview.total, 'channels-summary__value');
    summaryActive = activeTile.value;
    summaryConfigured = configuredTile.value;
    summaryTotal = totalTile.value;
    summary.append(activeTile.tile, configuredTile.tile, totalTile.tile);
    header.append(headerText, summary);

    const body = createElement('div', 'channels__body');
    cardsWrap = createElement('section', 'channels-grid');
    for (const channelName of CHANNEL_ORDER) {
      cardsWrap.append(createChannelCard(channelName));
    }

    const history = createElement('aside', 'channels-history');
    const historyHeader = createElement('div', 'channels-history__header');
    const historyCopy = createElement('div', 'channels-history__copy');
    historyCopy.append(
      createElement('h3', 'channels-history__title', strings.history.title),
      createElement('p', 'channels-history__subtitle', strings.history.subtitle)
    );
    const clearButton = createElement('button', 'channels-history__clear');
    clearButton.type = 'button';
    clearButton.append(createIcon('trash', 'channels-history__clear-icon'), createElement('span', '', strings.history.clear));
    clearButton.addEventListener('click', async () => {
      await invokeIpc('channels:clear-messages');
      await populate();
    });
    historyHeader.append(historyCopy, clearButton);
    historyList = createElement('div', 'channels-history__list');
    history.append(historyHeader, historyList);
    body.append(cardsWrap, history);

    panel.append(header, body);
    panel._populate = populate;
    return panel;
  }

  return { build, populate };
}
