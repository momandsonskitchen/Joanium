import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createTwoColGrid } from '../../Shared/TwoColGrid/TwoColGrid.js';

const CHANNEL_ORDER = ['telegram', 'whatsapp', 'discord', 'slack'];

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

function getChannelIconPath(channelName) {
  const names = {
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    discord: 'Discord',
    slack: 'Slack'
  };
  return `../../../Assets/Icons/${names[channelName]}.png`;
}

export function createChannelsPanel(strings) {
  let panel = null;
  let cardsWrap = null;
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
  }

  function getPayload(channelName) {
    const refs = cardRefs.get(channelName);
    const payload = {};

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
      const val = refs.inputs.botToken.value.trim();
      if (!val && !hasSavedSecret(refs.inputs.botToken)) {
        refs.inputs.botToken.focus();
        setFeedback(channelName, strings.common.required, 'error');
        return false;
      }
      if (val && val.length < 10) {
        refs.inputs.botToken.focus();
        setFeedback(channelName, strings.common.tokenTooShort, 'error');
        return false;
      }
    }

    if (channelName === 'whatsapp') {
      const sidVal = refs.inputs.accountSid.value.trim();
      if (!sidVal && !hasSavedSecret(refs.inputs.accountSid)) {
        refs.inputs.accountSid.focus();
        setFeedback(channelName, strings.common.required, 'error');
        return false;
      }
      if (sidVal && sidVal.length < 10) {
        refs.inputs.accountSid.focus();
        setFeedback(channelName, strings.common.sidTooShort, 'error');
        return false;
      }
      const authVal = refs.inputs.authToken.value.trim();
      if (!authVal && !hasSavedSecret(refs.inputs.authToken)) {
        refs.inputs.authToken.focus();
        setFeedback(channelName, strings.common.required, 'error');
        return false;
      }
      if (authVal && authVal.length < 10) {
        refs.inputs.authToken.focus();
        setFeedback(channelName, strings.common.authTokenTooShort, 'error');
        return false;
      }
      const numVal = refs.inputs.fromNumber.value.trim();
      if (!numVal) {
        refs.inputs.fromNumber.focus();
        setFeedback(channelName, strings.common.required, 'error');
        return false;
      }
      if (numVal.replace(/[^0-9]/g, '').length < 7) {
        refs.inputs.fromNumber.focus();
        setFeedback(channelName, strings.common.numberTooShort, 'error');
        return false;
      }
    }

    if (channelName === 'discord' || channelName === 'slack') {
      const tokenVal = refs.inputs.botToken.value.trim();
      if (!tokenVal && !hasSavedSecret(refs.inputs.botToken)) {
        refs.inputs.botToken.focus();
        setFeedback(channelName, strings.common.required, 'error');
        return false;
      }
      if (tokenVal && tokenVal.length < 10) {
        refs.inputs.botToken.focus();
        setFeedback(channelName, strings.common.tokenTooShort, 'error');
        return false;
      }
      const channelIdVal = refs.inputs.channelId.value.trim();
      if (!channelIdVal) {
        refs.inputs.channelId.focus();
        setFeedback(channelName, strings.common.required, 'error');
        return false;
      }
      if (channelIdVal.length < 5) {
        refs.inputs.channelId.focus();
        setFeedback(channelName, strings.common.channelIdTooShort, 'error');
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
      const result = await invokeIpc('channels:validate', channelName, {
        botToken: payload.botToken,
        channelId: payload.channelId
      });
      setFeedback(channelName, formatText(strings.feedback.tokenVerified, {
        value: result.channelName || (result.username ? `@${result.username}` : strings.channels.discord.name)
      }), 'success');
    }

    if (channelName === 'slack' && payload.botToken) {
      const result = await invokeIpc('channels:validate', channelName, {
        botToken: payload.botToken,
        channelId: payload.channelId
      });
      setFeedback(channelName, formatText(strings.feedback.slackVerified, {
        value: result.channelName || result.team || result.name || strings.channels.slack.name
      }), 'success');
    }
  }

  async function connectChannel(channelName) {
    const refs = cardRefs.get(channelName);
    if (!validateRequired(channelName)) {
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
    const card = createElement('article', 'channels-card');

    // ── Header (always visible) ──────────────────────────────────────────────
    const header = createElement('div', 'channels-card__header');
    const badge = createElement('div', 'channels-card__badge');
    const badgeImg = document.createElement('img');
    badgeImg.src = getChannelIconPath(channelName);
    badgeImg.alt = '';
    badgeImg.className = 'channels-card__badge-img';
    badge.append(badgeImg);
    const titleWrap = createElement('div', 'channels-card__title-wrap');
    const titleRow = createElement('div', 'channels-card__title-row');
    const status = createElement('span', 'channels-card__status', strings.common.notConnected);

    titleRow.append(createElement('h3', 'channels-card__title', channelStrings.name), status);
    titleWrap.append(titleRow);

    const toggleWrap = createElement('label', 'channels-toggle');
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'channels-toggle__input';
    toggle.disabled = true;
    toggle.addEventListener('change', () => {
      void toggleChannel(channelName, toggle.checked);
    });
    toggleWrap.append(toggle, createElement('span', 'channels-toggle__track'));

    const expandBtn = createElement('button', 'channels-card__expand');
    expandBtn.type = 'button';
    expandBtn.setAttribute('aria-label', strings.common.expand);
    expandBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>`;

    header.append(badge, titleWrap, toggleWrap, expandBtn);

    // ── Collapsible body ─────────────────────────────────────────────────────
    const body = createElement('div', 'channels-card__body');
    const bodyInner = createElement('div', 'channels-card__body-inner');

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

    const summary = createElement('p', 'channels-card__summary', channelStrings.summary);
    bodyInner.append(summary, steps, form, actions, feedback);
    body.append(bodyInner);
    card.append(header, body);

    expandBtn.addEventListener('click', () => {
      const isOpen = card.classList.contains('channels-card--open');
      // Close all cards
      for (const [, r] of cardRefs) {
        r.card.classList.remove('channels-card--open');
        r.card.querySelector('.channels-card__expand')?.setAttribute('aria-label', strings.common.expand);
      }
      // Open this one only if it was closed
      if (!isOpen) {
        card.classList.add('channels-card--open');
        expandBtn.setAttribute('aria-label', strings.common.collapse);
      }
    });

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

  async function populate() {
    const channels = await invokeIpc('channels:list');
    for (const channelName of CHANNEL_ORDER) {
      setCardState(channelName, channels[channelName] ?? {});
    }
  }

  function build() {
    panel = createElement('div', 'channels');
    panel.hidden = true;

    const body = createElement('div', 'channels__body');
    cardsWrap = createTwoColGrid();
    for (const channelName of CHANNEL_ORDER) {
      cardsWrap.append(createChannelCard(channelName));
    }
    body.append(cardsWrap.el);

    panel.append(body);
    panel._populate = populate;
    return panel;
  }

  return { build, populate };
}
