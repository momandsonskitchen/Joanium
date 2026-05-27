import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createTwoColGrid } from '../../Shared/TwoColGrid/TwoColGrid.js';
import defaultStrings from '../I18n/Connectors.en.js';

// ── Icon map: connector id → filename in Assets/Icons/ ──────────────────────
const ICON_MAP = {
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
    : [
        {
          key: connector.credentialKey,
          label: connector.credentialLabel,
          placeholder: connector.credentialPlaceholder,
          type: 'password',
          required: !connector.optional,
        },
      ];
}

function getVisibleFields(connector) {
  return getConnectorFields(connector).filter((field) => !field.hidden);
}

function isPublicConnector(connector) {
  return (
    connector.publicTool === true || connector.noCredential === true || connector.noKey === true
  );
}

function createConnectorBadge(connector) {
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

  return badge;
}

function createConnectorCopy(connector) {
  const copy = createElement('div', 'connectors-card__copy');
  copy.append(
    createElement('h3', 'connectors-card__title', connector.label),
    createElement('p', 'connectors-card__description', connector.description),
  );
  return copy;
}

export function createConnectorsPanel(strings = defaultStrings) {
  const refs = new Map();
  let servicesMount = null;
  let publicMount = null;

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

  function collectCredentials(connector, inputs, { allowOptionalBlank = false } = {}) {
    const credentials = {};
    let firstMissingInput = null;
    let firstShortInput = null;

    for (const field of getVisibleFields(connector)) {
      const input = inputs.get(field.key);
      credentials[field.key] = input?.value.trim() ?? '';
      const fieldHasSavedCredential = input?.placeholder === strings.savedSecret;
      const canSkipBlank = allowOptionalBlank && connector.optional;

      if (
        field.required !== false &&
        !credentials[field.key] &&
        !fieldHasSavedCredential &&
        !canSkipBlank &&
        !firstMissingInput
      ) {
        firstMissingInput = input;
      }

      if (
        !firstShortInput &&
        field.type !== 'text' &&
        credentials[field.key] &&
        credentials[field.key].length < 10
      ) {
        firstShortInput = input;
      }
    }

    return { credentials, firstMissingInput, firstShortInput };
  }

  function showCredentialError(connectorId, { firstMissingInput, firstShortInput }) {
    if (firstMissingInput) {
      firstMissingInput.focus();
      setFeedback(connectorId, strings.credentialRequired, 'error');
      return true;
    }

    if (firstShortInput) {
      firstShortInput.focus();
      setFeedback(connectorId, strings.credentialTooShort, 'error');
      return true;
    }

    return false;
  }

  async function saveConnector(connector) {
    const ref = refs.get(connector.id);
    const validation = collectCredentials(connector, ref.inputs, { allowOptionalBlank: true });
    if (showCredentialError(connector.id, validation)) return;

    ref.save.disabled = true;
    ref.saveLabel.textContent = strings.saving;
    setFeedback(connector.id, '', 'info');

    try {
      const updated = await invokeIpc('connectors:save', connector.id, {
        credentials: validation.credentials,
      });
      setCardState(updated);
      setFeedback(connector.id, strings.connectedFeedback, 'success');
      window.dispatchEvent(new CustomEvent('joanium:connectors-changed'));
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
      window.dispatchEvent(new CustomEvent('joanium:connectors-changed'));
    } catch (error) {
      setFeedback(connector.id, error?.message ?? strings.disconnectFailed, 'error');
    }
  }

  function createConnectorCard(connector) {
    const card = createElement('article', 'connectors-card');

    // ── Header (always visible) ──────────────────────────────────────────────
    const header = createElement('div', 'connectors-card__header');

    const status = createElement('span', 'connectors-card__status', strings.notConnected);

    const expandBtn = createElement('button', 'connectors-card__expand');
    expandBtn.type = 'button';
    expandBtn.setAttribute('aria-label', strings.expand);
    expandBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>`;

    header.append(
      createConnectorBadge(connector),
      createConnectorCopy(connector),
      status,
      expandBtn,
    );

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
    remove.addEventListener('click', () => {
      void removeConnector(connector);
    });

    let save;
    let saveLabel;

    if (connector.oauthChannel) {
      // ── OAuth flow button ──────────────────────────────────────────────────
      save = createElement('button', 'connectors-card__primary');
      saveLabel = createElement('span', 'connectors-card__primary-label', strings.connect);
      save.type = 'button';
      save.append(saveLabel);
      save.addEventListener('click', async () => {
        const validation = collectCredentials(connector, inputs);
        if (showCredentialError(connector.id, validation)) return;

        save.disabled = true;
        saveLabel.textContent = strings.connecting;
        setFeedback(connector.id, '', 'info');
        try {
          const updated = await invokeIpc(connector.oauthChannel, validation.credentials);
          setCardState(updated);
          setFeedback(connector.id, strings.connectedFeedback, 'success');
          window.dispatchEvent(new CustomEvent('joanium:connectors-changed'));
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
      save.addEventListener('click', () => {
        void saveConnector(connector);
      });
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
        ref.card
          .querySelector('.connectors-card__expand')
          ?.setAttribute('aria-label', strings.expand);
      }
      // Open this one only if it was closed
      if (!isOpen) {
        card.classList.add('connectors-card--open');
        expandBtn.setAttribute('aria-label', strings.collapse);
      }
    });

    refs.set(connector.id, { card, inputs, status, save, saveLabel, remove, feedback });
    setCardState(connector);
    return card;
  }

  function createPublicConnectorCard(connector) {
    const card = createElement(
      'article',
      'connectors-card connectors-card--connected connectors-card--public',
    );
    const header = createElement('div', 'connectors-card__header');
    const status = createElement(
      'span',
      'connectors-card__status connectors-card__status--active',
      strings.available,
    );
    header.append(createConnectorBadge(connector), createConnectorCopy(connector), status);
    card.append(header);

    if (connector.toolHint) {
      const hint = createElement('p', 'connectors-card__public-hint', connector.toolHint);
      card.append(hint);
    }

    return card;
  }

  function createSection(title, subtitle) {
    const section = createElement('section', 'connectors-section');
    const header = createElement('div', 'connectors-section__header');
    header.append(
      createElement('h3', 'connectors-section__title', title),
      createElement('p', 'connectors-section__subtitle', subtitle),
    );
    const mount = createElement('div', 'connectors-section__grid');
    section.append(header, mount);
    return { section, mount };
  }

  function renderGrid(mount, connectors, createCard) {
    mount.replaceChildren();
    if (!connectors.length) {
      mount.append(createElement('p', 'connectors-section__empty', strings.emptySection));
      return;
    }

    const nextGrid = createTwoColGrid();
    for (const connector of connectors) {
      nextGrid.append(createCard(connector));
    }
    mount.append(nextGrid.el);
  }

  function build() {
    const panel = createElement('div', 'connectors');
    const servicesSection = createSection(strings.credentialsTitle, strings.credentialsSubtitle);
    const publicSection = createSection(strings.publicTitle, strings.publicSubtitle);
    servicesMount = servicesSection.mount;
    publicMount = publicSection.mount;
    panel.append(servicesSection.section, publicSection.section);
    return panel;
  }

  async function populate() {
    const connectors = await invokeIpc('connectors:list');
    const serviceConnectors = connectors.filter((connector) => !isPublicConnector(connector));
    const publicConnectors = connectors.filter(isPublicConnector);

    refs.clear();
    renderGrid(servicesMount, serviceConnectors, createConnectorCard);
    renderGrid(publicMount, publicConnectors, createPublicConnectorCard);

    for (const connector of serviceConnectors) {
      setCardState(connector);
    }
  }

  return { build, populate };
}
