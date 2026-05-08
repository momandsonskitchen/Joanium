import { createElement } from '../../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../../Shared/Ipc/RendererIpc.js';
import { createIcon } from '../../../Shared/Icons/Icons.js';
import defaultStrings from '../I18n/en.js';

function createCredentialField({ connector, strings }) {
  const field = createElement('label', 'connectors-field');
  const label = createElement('span', 'connectors-field__label', connector.credentialLabel);
  const holder = createElement('div', 'connectors-field__secret');
  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'connectors-field__input';
  input.placeholder = connector.credentialPlaceholder;
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
    if (connector.credentialSaved) {
      ref.input.value = '';
      ref.input.placeholder = strings.savedSecret;
    } else {
      ref.input.placeholder = connector.credentialPlaceholder;
    }
  }

  async function saveConnector(connector) {
    const ref = refs.get(connector.id);
    const credential = ref.input.value.trim();
    const hasSavedCredential = ref.input.placeholder === strings.savedSecret;

    if (!credential && !connector.optional && !hasSavedCredential) {
      ref.input.focus();
      setFeedback(connector.id, strings.credentialRequired, 'error');
      return;
    }

    ref.save.disabled = true;
    ref.saveLabel.textContent = strings.saving;
    setFeedback(connector.id, '', 'info');

    try {
      const updated = await invokeIpc('connectors:save', connector.id, { credential });
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
      ref.input.value = '';
      ref.input.placeholder = connector.credentialPlaceholder;
      setCardState({ ...connector, configured: connector.optional, credentialSaved: false });
      setFeedback(connector.id, strings.disconnectedFeedback, 'info');
    } catch (error) {
      setFeedback(connector.id, error?.message ?? strings.disconnectFailed, 'error');
    }
  }

  function createConnectorCard(connector) {
    const card = createElement('article', 'connectors-card');
    const header = createElement('div', 'connectors-card__header');
    const badge = createElement('div', 'connectors-card__badge');
    badge.append(createIcon(connector.id === 'github' ? 'github' : 'globe', 'connectors-card__badge-icon'));

    const copy = createElement('div', 'connectors-card__copy');
    const titleRow = createElement('div', 'connectors-card__title-row');
    titleRow.append(
      createElement('h3', 'connectors-card__title', connector.label),
      createElement('span', 'connectors-card__pill', connector.optional ? strings.optional : strings.required)
    );
    copy.append(titleRow, createElement('p', 'connectors-card__description', connector.description));

    const status = createElement('span', 'connectors-card__status', strings.notConnected);
    header.append(badge, copy, status);

    const body = createElement('div', 'connectors-card__body');
    const { field, input } = createCredentialField({ connector, strings });
    const actions = createElement('div', 'connectors-card__actions');
    const remove = createElement('button', 'connectors-card__secondary', strings.disconnect);
    const save = createElement('button', 'connectors-card__primary');
    const saveLabel = createElement('span', 'connectors-card__primary-label', strings.save);
    remove.type = 'button';
    save.type = 'button';
    remove.hidden = true;
    save.append(saveLabel);
    remove.addEventListener('click', () => { void removeConnector(connector); });
    save.addEventListener('click', () => { void saveConnector(connector); });
    actions.append(remove, save);

    const feedback = createElement('div', 'connectors-card__feedback');
    feedback.hidden = true;
    feedback.setAttribute('aria-live', 'polite');

    body.append(field, actions, feedback);
    card.append(header, body);
    refs.set(connector.id, { card, input, status, save, saveLabel, remove, feedback });
    setCardState(connector);
    return card;
  }

  function build() {
    const panel = createElement('div', 'connectors');
    const header = createElement('div', 'connectors__header');
    header.append(
      createElement('h2', 'connectors__title', strings.title),
      createElement('p', 'connectors__subtitle', strings.subtitle)
    );
    grid = createElement('section', 'connectors-grid');
    panel.append(header, grid);
    return panel;
  }

  async function populate() {
    const connectors = await invokeIpc('connectors:list');
    if (grid.childElementCount === 0) {
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
