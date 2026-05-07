import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';

function createSecretField({ label, placeholder, strings }) {
  const wrap = createElement('label', 'providers-field');
  const labelEl = createElement('span', 'providers-field__label', label);
  const holder = createElement('div', 'providers-field__secret');
  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'providers-field__input providers-field__input--secret';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;

  const toggle = createElement('button', 'providers-field__secret-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', strings.show ?? 'Show');
  toggle.append(createIcon('eye', 'providers-field__secret-icon'));

  toggle.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    toggle.setAttribute('aria-label', hidden ? (strings.hide ?? 'Hide') : (strings.show ?? 'Show'));
  });

  holder.append(input, toggle);
  wrap.append(labelEl, holder);
  return { wrap, input };
}

function createTextField({ label, placeholder }) {
  const wrap = createElement('label', 'providers-field');
  const labelEl = createElement('span', 'providers-field__label', label);
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'providers-field__input';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  wrap.append(labelEl, input);
  return { wrap, input };
}

export function createProvidersPanel(strings) {
  const cardRefs = new Map();
  let grid = null;

  function setFeedback(providerId, message, tone = 'info') {
    const refs = cardRefs.get(providerId);
    if (!refs?.feedback) return;
    refs.feedback.textContent = message;
    refs.feedback.className = `providers-card__feedback providers-card__feedback--${tone}`;
    refs.feedback.hidden = !message;
  }

  function refreshDisconnectGuards() {
    const configuredCount = [...cardRefs.values()].filter(
      (refs) => refs.card.classList.contains('providers-card--connected')
    ).length;

    for (const refs of cardRefs.values()) {
      const isConnected = refs.card.classList.contains('providers-card--connected');
      const isLast = isConnected && configuredCount === 1;
      refs.disconnect.disabled = isLast;
      refs.disconnect.title = '';
    }
  }

  function setCardState(providerId, provider) {
    const refs = cardRefs.get(providerId);
    if (!refs) return;

    const configured = Boolean(provider?.configured);
    refs.card.classList.toggle('providers-card--connected', configured);
    refs.status.textContent = configured ? strings.connected : strings.notConnected;
    refs.status.className = `providers-card__status${configured ? ' providers-card__status--active' : ''}`;
    refs.disconnect.hidden = !configured;

    if (refs.apiKeyInput && provider?.apiKeySaved) {
      refs.apiKeyInput.placeholder = strings.savedSecret;
    }

    if (refs.endpointInput && provider?.savedEndpoint) {
      refs.endpointInput.value = provider.savedEndpoint;
    }
  }

  async function connectProvider(providerId) {
    const refs = cardRefs.get(providerId);
    const incoming = {};

    if (refs.apiKeyInput) {
      const val = refs.apiKeyInput.value.trim();
      const hasSaved = refs.apiKeyInput.placeholder === strings.savedSecret;
      if (!val && !hasSaved) {
        refs.apiKeyInput.focus();
        setFeedback(providerId, strings.required, 'error');
        return;
      }
      if (val) incoming.apiKey = val;
    }

    if (refs.endpointInput) {
      const val = refs.endpointInput.value.trim();
      if (!val) {
        refs.endpointInput.focus();
        setFeedback(providerId, strings.required, 'error');
        return;
      }
      incoming.endpoint = val;
    }

    refs.connectBtn.disabled = true;
    refs.connectLabel.textContent = strings.connecting;
    setFeedback(providerId, '', 'info');

    try {
      const saved = await invokeIpc('providers:save', providerId, incoming);
      if (refs.apiKeyInput) refs.apiKeyInput.value = '';
      setCardState(providerId, saved);
      refreshDisconnectGuards();
      setFeedback(providerId, strings.connected_feedback, 'success');
    } catch (error) {
      setFeedback(providerId, error?.message ?? strings.saveFailed, 'error');
    } finally {
      refs.connectBtn.disabled = false;
      refs.connectLabel.textContent = strings.connect;
    }
  }

  async function disconnectProvider(providerId) {
    try {
      await invokeIpc('providers:remove', providerId);
      const refs = cardRefs.get(providerId);
      if (refs.apiKeyInput) {
        refs.apiKeyInput.value = '';
        refs.apiKeyInput.placeholder = strings.apiKeyPlaceholder;
      }
      if (refs.endpointInput) refs.endpointInput.value = '';
      setCardState(providerId, { configured: false });
      refreshDisconnectGuards();
      setFeedback(providerId, strings.disconnected_feedback, 'info');
    } catch (error) {
      const message = error?.message === 'last_provider'
        ? strings.lastProvider
        : (error?.message ?? strings.disconnectFailed);
      setFeedback(providerId, message, 'error');
    }
  }

  function createProviderCard(provider) {
    const card = createElement('article', 'providers-card');

    // ── Header ───────────────────────────────────────────────────────────────
    const header = createElement('div', 'providers-card__header');

    const badge = createElement('div', 'providers-card__badge');
    badge.style.setProperty('--provider-tint', provider.palette?.tint ?? '#d0b4a2');
    badge.style.setProperty('--provider-glow', provider.palette?.glow ?? '#f7ede7');

    if (provider.iconPath) {
      const img = document.createElement('img');
      img.src = provider.iconPath;
      img.alt = '';
      img.className = 'providers-card__badge-img';
      badge.append(img);
    }

    const titleWrap = createElement('div', 'providers-card__title-wrap');
    const titleRow = createElement('div', 'providers-card__title-row');
    titleRow.append(createElement('h3', 'providers-card__title', provider.label));

    const typePill = createElement('span', `providers-card__type providers-card__type--${provider.type}`,
      provider.type === 'local' ? strings.local : strings.cloud
    );
    titleRow.append(typePill);

    const meta = createElement('p', 'providers-card__meta',
      strings.models(provider.modelCount)
    );
    titleWrap.append(titleRow, meta);

    const status = createElement('span', 'providers-card__status', strings.notConnected);

    const expandBtn = createElement('button', 'providers-card__expand');
    expandBtn.type = 'button';
    expandBtn.setAttribute('aria-label', strings.expand);
    expandBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>`;

    header.append(badge, titleWrap, status, expandBtn);

    // ── Collapsible body ─────────────────────────────────────────────────────
    const body = createElement('div', 'providers-card__body');
    const bodyInner = createElement('div', 'providers-card__body-inner');

    let apiKeyInput = null;
    let endpointInput = null;

    if (provider.requiresApiKey) {
      const field = createSecretField({
        label: strings.apiKeyLabel,
        placeholder: strings.apiKeyPlaceholder,
        strings
      });
      apiKeyInput = field.input;
      bodyInner.append(field.wrap);
    } else {
      const field = createTextField({
        label: strings.endpointLabel,
        placeholder: provider.requirements?.[0]?.defaultValue ?? 'http://localhost:11434'
      });
      endpointInput = field.input;
      bodyInner.append(field.wrap);
    }

    const actions = createElement('div', 'providers-card__actions');
    const disconnect = createElement('button', 'providers-card__secondary', strings.disconnect);
    const connectBtn = createElement('button', 'providers-card__primary');
    const connectLabel = createElement('span', 'providers-card__primary-label', strings.connect);
    disconnect.type = 'button';
    connectBtn.type = 'button';
    disconnect.hidden = true;

    disconnect.addEventListener('click', () => { void disconnectProvider(provider.id); });
    connectBtn.addEventListener('click', () => { void connectProvider(provider.id); });
    connectBtn.append(connectLabel);
    actions.append(disconnect, connectBtn);

    const feedback = createElement('div', 'providers-card__feedback');
    feedback.hidden = true;
    feedback.setAttribute('aria-live', 'polite');

    bodyInner.append(actions, feedback);
    body.append(bodyInner);
    card.append(header, body);

    expandBtn.addEventListener('click', () => {
      const open = card.classList.toggle('providers-card--open');
      expandBtn.setAttribute('aria-label', open ? strings.collapse : strings.expand);
    });

    cardRefs.set(provider.id, {
      card,
      status,
      disconnect,
      connectBtn,
      connectLabel,
      feedback,
      apiKeyInput,
      endpointInput
    });

    return card;
  }

  function build() {
    const panel = createElement('div', 'providers');

    const header = createElement('div', 'providers__header');
    header.append(
      createElement('h2', 'providers__title', strings.title),
      createElement('p', 'providers__subtitle', strings.subtitle)
    );

    grid = createElement('section', 'providers-grid');

    panel.append(header, grid);
    return panel;
  }

  async function populate() {
    const providers = await invokeIpc('providers:list-configured');

    if (grid.childElementCount === 0) {
      for (const provider of providers) {
        grid.append(createProviderCard(provider));
      }
    }

    for (const provider of providers) {
      setCardState(provider.id, provider);
    }

    refreshDisconnectGuards();
  }

  return { build, populate };
}
