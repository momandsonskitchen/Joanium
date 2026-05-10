import { createElement } from '../../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../../Shared/Icons/Icons.js';
import { createTwoColGrid } from '../../../Shared/TwoColGrid/TwoColGrid.js';
import defaultStrings from '../I18n/en.js';

// ── Icon map: connector id → filename in Assets/Icons/ ──────────────────────
const ICON_MAP = {
  github:       'Github',
  openweather:  'OpenWeatherMap',
  google:       'Google',
  gmail:        'Gmail',
  drive:        'Drive',
  calendar:     'Calendar',
  notion:       'Notion',
  slack:        'Slack',
  discord:      'Discord',
  telegram:     'Telegram',
  spotify:      'Spotify',
  stripe:       'Stripe',
  supabase:     'Supabase',
  vercel:       'Vercel',
  netlify:      'Netlify',
  gitlab:       'Gitlab',
  jira:         'Jira',
  linear:       'Linear',
  hubspot:      'Hubspot',
  sentry:       'Sentry',
  figma:        'Figma',
  unsplash:     'Unsplash',
  wikipedia:    'Wikipedia',
  nasa:         'Nasa',
  coingecko:    'CoinGecko',
  perplexity:   'Perplexity',
  youtube:      'Youtube',
  whatsapp:     'WhatsApp',
  cloudflare:   'Cloudflare',
};

function getConnectorIconPath(connectorId) {
  const file = ICON_MAP[connectorId?.toLowerCase()];
  // Path is relative to Packages/Shell/UI/App.html (the renderer entry point)
  return file ? `../../../Assets/Icons/${file}.png` : null;
}

// ────────────────────────────────────────────────────────────────────────────

function createCredentialField({ fieldConfig, strings }) {
  const field = createElement('label', 'connectors-field');
  const label = createElement('span', 'connectors-field__label', fieldConfig.label);
  const holder = createElement('div', 'connectors-field__secret');
  const input = document.createElement('input');
  input.type = fieldConfig.type === 'text' ? 'text' : 'password';
  input.className = 'connectors-field__input';
  input.placeholder = fieldConfig.placeholder ?? '';
  input.autocomplete = 'off';
  input.spellcheck = false;

  const toggle = createElement('button', 'connectors-field__toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', strings.show);
  toggle.append(createIcon('eye', 'connectors-field__toggle-icon'));
  toggle.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    toggle.setAttribute('aria-label', hidden ? strings.hide : strings.show);
  });

  holder.append(input, toggle);
  field.append(label, holder);
  return { field, input };
}

function getConnectorFields(connector) {
  return Array.isArray(connector.fields) && connector.fields.length
    ? connector.fields
    : [{
        key: connector.credentialKey,
        label: connector.credentialLabel,
        placeholder: connector.credentialPlaceholder,
        type: 'password',
        required: !connector.optional
      }];
}

function getVisibleFields(connector) {
  return getConnectorFields(connector).filter((field) => !field.hidden);
}

export function createConnectorsPanel(strings = defaultStrings) {
  const refs = new Map();
  let grid = null;

  function setFeedback(connectorId, message, tone = 'info') {
    const ref = refs.get(connectorId);
    if (!ref) return;
    ref.feedback.textContent = message;
    ref.feedback.className = `connectors-card__feedback connectors-card__feedback--${tone}`;
    ref.feedback.hidden = !message;
  }

  function setCardState(connector) {
    const ref = refs.get(connector.id);
    if (!ref) return;

    ref.card.classList.toggle('connectors-card--connected', Boolean(connector.configured));
    ref.status.textContent = connector.configured ? strings.connected : strings.notConnected;
    ref.status.className = `connectors-card__status${connector.configured ? ' connectors-card__status--active' : ''}`;
    ref.remove.hidden = !connector.credentialSaved;
    const savedKeys = new Set(connector.savedCredentialKeys ?? []);

    for (const field of getVisibleFields(connector)) {
      const input = ref.inputs.get(field.key);
      if (!input) continue;
      if (savedKeys.has(field.key)) {
        input.value = '';
        input.placeholder = strings.savedSecret;
      } else {
        input.placeholder = field.placeholder ?? '';
      }
    }
  }

  async function saveConnector(connector) {
    const ref = refs.get(connector.id);
    const credentials = {};
    let firstMissingInput = null;

    for (const field of getVisibleFields(connector)) {
      const input = ref.inputs.get(field.key);
      credentials[field.key] = input.value.trim();
      const fieldHasSavedCredential = input.placeholder === strings.savedSecret;
      if (field.required !== false && !credentials[field.key] && !connector.optional && !fieldHasSavedCredential && !firstMissingInput) {
        firstMissingInput = input;
      }
    }

    if (firstMissingInput) {
      firstMissingInput.focus();
      setFeedback(connector.id, strings.credentialRequired, 'error');
      return;
    }

    ref.save.disabled = true;
    ref.saveLabel.textContent = strings.saving;
    setFeedback(connector.id, '', 'info');

    try {
      const updated = await invokeIpc('connectors:save', connector.id, { credentials });
      setCardState(updated);
      setFeedback(connector.id, strings.connectedFeedback, 'success');
    } catch (error) {
      setFeedback(connector.id, error?.message ?? strings.saveFailed, 'error');
    } finally {
      ref.save.disabled = false;
      ref.saveLabel.textContent = strings.save;
    }
  }

  async function removeConnector(connector) {
    try {
      await invokeIpc('connectors:remove', connector.id);
      const ref = refs.get(connector.id);
      for (const field of getConnectorFields(connector)) {
        const input = ref.inputs.get(field.key);
        if (!input) continue;
        input.value = '';
        input.placeholder = field.placeholder ?? '';
      }
      setCardState({ ...connector, configured: connector.optional, credentialSaved: false });
      setFeedback(connector.id, strings.disconnectedFeedback, 'info');
    } catch (error) {
      setFeedback(connector.id, error?.message ?? strings.disconnectFailed, 'error');
    }
  }

  function createConnectorCard(connector) {
    const card = createElement('article', 'connectors-card');

    // ── Header (always visible) ──────────────────────────────────────────────
    const header = createElement('div', 'connectors-card__header');

    // Real icon image or SVG fallback
    const badge = createElement('div', 'connectors-card__badge');
    const iconPath = getConnectorIconPath(connector.id);
    if (iconPath) {
      const img = document.createElement('img');
      img.src = iconPath;
      img.alt = '';
      img.className = 'connectors-card__badge-img';
      badge.append(img);
    } else {
      badge.append(createIcon('globe', 'connectors-card__badge-icon'));
    }

    const copy = createElement('div', 'connectors-card__copy');
    copy.append(
      createElement('h3', 'connectors-card__title', connector.label),
      createElement('p', 'connectors-card__description', connector.description)
    );

    const status = createElement('span', 'connectors-card__status', strings.notConnected);

    const expandBtn = createElement('button', 'connectors-card__expand');
    expandBtn.type = 'button';
    expandBtn.setAttribute('aria-label', 'Expand');
    expandBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>`;

    header.append(badge, copy, status, expandBtn);

    // ── Collapsible body ─────────────────────────────────────────────────────
    const body = createElement('div', 'connectors-card__body');
    const bodyInner = createElement('div', 'connectors-card__body-inner');

    const inputs = new Map();
    const fields = getVisibleFields(connector).map((fieldConfig) => {
      const { field, input } = createCredentialField({ fieldConfig, strings });
      inputs.set(fieldConfig.key, input);
      return field;
    });
    const actions = createElement('div', 'connectors-card__actions');
    const remove = createElement('button', 'connectors-card__secondary', strings.disconnect);
    remove.type = 'button';
    remove.hidden = true;
    remove.addEventListener('click', () => { void removeConnector(connector); });

    let save;
    let saveLabel;

    if (connector.oauthChannel) {
      // ── OAuth flow button ──────────────────────────────────────────────────
      save = createElement('button', 'connectors-card__primary');
      saveLabel = createElement('span', 'connectors-card__primary-label', strings.connect);
      save.type = 'button';
      save.append(saveLabel);
      save.addEventListener('click', async () => {
        const credentials = {};
        let firstMissing = null;
        for (const field of getVisibleFields(connector)) {
          const input = inputs.get(field.key);
          credentials[field.key] = input?.value.trim() ?? '';
          const hasSaved = input?.placeholder === strings.savedSecret;
          if (field.required !== false && !credentials[field.key] && !hasSaved && !firstMissing) {
            firstMissing = input;
          }
        }
        if (firstMissing) {
          firstMissing.focus();
          setFeedback(connector.id, strings.credentialRequired, 'error');
          return;
        }
        save.disabled = true;
        saveLabel.textContent = strings.connecting;
        setFeedback(connector.id, '', 'info');
        try {
          const updated = await invokeIpc(connector.oauthChannel, credentials);
          setCardState(updated);
          setFeedback(connector.id, strings.connectedFeedback, 'success');
        } catch (error) {
          setFeedback(connector.id, error?.message ?? strings.oauthFailed, 'error');
        } finally {
          save.disabled = false;
          saveLabel.textContent = strings.connect;
        }
      });
    } else {
      // ── Normal save button ─────────────────────────────────────────────────
      save = createElement('button', 'connectors-card__primary');
      saveLabel = createElement('span', 'connectors-card__primary-label', strings.save);
      save.type = 'button';
      save.append(saveLabel);
      save.addEventListener('click', () => { void saveConnector(connector); });
    }

    actions.append(remove, save);

    const feedback = createElement('div', 'connectors-card__feedback');
    feedback.hidden = true;
    feedback.setAttribute('aria-live', 'polite');

    bodyInner.append(...fields, actions, feedback);
    body.append(bodyInner);
    card.append(header, body);

    expandBtn.addEventListener('click', () => {
      const isOpen = card.classList.contains('connectors-card--open');
      // Close all cards
      for (const [, ref] of refs) {
        ref.card.classList.remove('connectors-card--open');
        ref.card.querySelector('.connectors-card__expand')?.setAttribute('aria-label', 'Expand');
      }
      // Open this one only if it was closed
      if (!isOpen) {
        card.classList.add('connectors-card--open');
        expandBtn.setAttribute('aria-label', 'Collapse');
      }
    });

    refs.set(connector.id, { card, inputs, status, save, saveLabel, remove, feedback });
    setCardState(connector);
    return card;
  }

  function build() {
    const panel = createElement('div', 'connectors');
    grid = createTwoColGrid();
    panel.append(grid.el);
    return panel;
  }

  async function populate() {
    const connectors = await invokeIpc('connectors:list');

    if (grid.el.querySelector('.connectors-card') === null) {
      for (const connector of connectors) {
        grid.append(createConnectorCard(connector));
      }
    }

    for (const connector of connectors) {
      setCardState(connector);
    }
  }

  return { build, populate };
}
