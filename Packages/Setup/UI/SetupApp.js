// Languages
import en from '../I18n/en.js';
import de from '../I18n/de.js';
import fr from '../I18n/fr.js';

// Shared Components
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createLogoLoader } from '../../Shared/LogoLoader/LogoLoader.js';
import { createButton } from '../../Shared/Button/Button.js';
import { createCheckbox } from '../../Shared/Checkbox/Checkbox.js';
import { createInputBox } from '../../Shared/InputBox/InputBox.js';
import { createApiKeyInput } from '../../Shared/ApiKeyInput/ApiKeyInput.js';
import { createProviderScroller } from '../../Shared/ProviderScroller/ProviderScroller.js';
import { createTagSelector } from '../../Shared/TagSelector/TagSelector.js';
import { createModal } from '../../Shared/Modal/Modal.js';
import {
  calculateLastCompletedStep,
  findInitialScene,
  getUsageSummary,
  hydrateSetupState,
  serializeSetupState,
  setupStepIds,
  validateStep
} from './SetupStore.js';

const dictionaries = { en, de, fr };

function getDictionary(locale) {
  return dictionaries[locale] ?? en;
}

function formatText(template, replacements) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template
  );
}

function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

function captureFocusState(container) {
  const activeElement = document.activeElement;

  if (!activeElement || !container.contains(activeElement) || !activeElement.__focusKey) {
    return null;
  }

  return {
    focusKey: activeElement.__focusKey,
    selectionStart:
      typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null,
    selectionEnd: typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null
  };
}

function restoreFocusState(container, focusState) {
  if (!focusState) {
    return;
  }

  const nextElement = Array.from(container.querySelectorAll('input, button')).find(
    (element) => element.__focusKey === focusState.focusKey
  );

  if (!nextElement) {
    return;
  }

  nextElement.focus();

  if (
    typeof nextElement.setSelectionRange === 'function' &&
    focusState.selectionStart !== null &&
    focusState.selectionEnd !== null
  ) {
    nextElement.setSelectionRange(focusState.selectionStart, focusState.selectionEnd);
  }
}

function createDocumentNodes(documentDefinition) {
  return documentDefinition.sections.map((section) => {
    const sectionElement = createElement('section', 'setup-document__section');
    sectionElement.append(
      createElement('h4', 'setup-document__heading', section.heading),
      createElement('p', 'setup-document__body', section.body)
    );
    return sectionElement;
  });
}

function createMonthPicker({ strings, selectedValue, onSelect }) {
  const months = strings.dob.months.filter((item) => item.value);
  const placeholderText = strings.dob.monthPlaceholder ?? 'Month';

  const wrapper = createElement('section', 'setup-month-picker');
  wrapper.append(createElement('span', 'setup-month-picker__label', strings.dob.monthLabel));

  const dropdownRoot = createElement('div', 'setup-month-dropdown');

  const trigger = createElement('button', 'setup-month-dropdown__trigger');
  trigger.type = 'button';
  trigger.__focusKey = 'profile.dob.month';

  const triggerLabel = createElement('span', 'setup-month-dropdown__trigger-label',
    selectedValue
      ? (months.find((m) => m.value === selectedValue)?.label ?? placeholderText)
      : placeholderText
  );
  triggerLabel.classList.toggle('is-placeholder', !selectedValue);

  const triggerChevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  triggerChevron.setAttribute('class', 'setup-month-dropdown__chevron');
  triggerChevron.setAttribute('viewBox', '0 0 16 16');
  triggerChevron.setAttribute('fill', 'none');
  triggerChevron.setAttribute('aria-hidden', 'true');
  const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  chevronPath.setAttribute('d', 'M3 5.5L8 10.5L13 5.5');
  chevronPath.setAttribute('stroke', 'currentColor');
  chevronPath.setAttribute('stroke-width', '1.75');
  chevronPath.setAttribute('stroke-linecap', 'round');
  chevronPath.setAttribute('stroke-linejoin', 'round');
  triggerChevron.append(chevronPath);
  trigger.append(triggerLabel, triggerChevron);

  const listbox = createElement('ul', 'setup-month-dropdown__listbox');
  listbox.setAttribute('role', 'listbox');

  let isOpen = false;

  for (const month of months) {
    const item = createElement('li', 'setup-month-dropdown__option', month.label);
    item.setAttribute('role', 'option');
    item.dataset.value = month.value;
    item.classList.toggle('is-selected', month.value === selectedValue);
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      triggerLabel.textContent = month.label;
      triggerLabel.classList.remove('is-placeholder');
      listbox.querySelectorAll('.setup-month-dropdown__option').forEach((el) => {
        el.classList.toggle('is-selected', el.dataset.value === month.value);
      });
      closeList();
      onSelect(month.value);
    });
    listbox.append(item);
  }

  function openList() {
    isOpen = true;
    const rect = trigger.getBoundingClientRect();
    listbox.style.top    = `${rect.bottom + 8}px`;
    listbox.style.left   = `${rect.left}px`;
    listbox.style.width  = `${rect.width}px`;
    listbox.classList.add('is-open');
    trigger.classList.add('is-open');
    triggerChevron.style.transform = 'rotate(180deg)';
  }

  function closeList() {
    isOpen = false;
    listbox.classList.remove('is-open');
    trigger.classList.remove('is-open');
    triggerChevron.style.transform = '';
  }

  trigger.addEventListener('click', () => {
    isOpen ? closeList() : openList();
  });

  trigger.addEventListener('blur', () => {
    setTimeout(() => {
      if (!dropdownRoot.contains(document.activeElement)) {
        closeList();
      }
    }, 100);
  });

  dropdownRoot.append(trigger, listbox);
  wrapper.append(dropdownRoot);
  return wrapper;
}

function createProviderIdentity(provider, strings) {
  const identity = createElement('div', 'setup-provider-detail-card__identity');
  const iconWrap = createElement('span', 'setup-provider-detail-card__icon');
  const iconImage = document.createElement('img');
  iconImage.className = 'setup-provider-detail-card__icon-image';
  iconImage.src = provider.iconPath;
  iconImage.alt = `${provider.label} icon`;
  iconWrap.append(iconImage);

  const textWrap = createElement('div', 'setup-provider-detail-card__copy');
  const titleRow = createElement('div', 'setup-provider-detail-card__title-row');
  titleRow.append(
    createElement('h3', 'setup-provider-detail-card__title', provider.label),
    createElement(
      'span',
      'setup-provider-detail-card__badge',
      provider.type === 'local' ? strings.common.localBadge : strings.common.cloudBadge
    )
  );
  textWrap.append(titleRow);
  identity.append(iconWrap, textWrap);
  return identity;
}

async function bootstrap() {
  const payload = await window.JoaniumSetup.bootstrap();
  const strings = getDictionary(payload.state.locale);
  const providersById = new Map(payload.providers.map((provider) => [provider.id, provider]));

  let state = hydrateSetupState({
    persistedState: payload.state,
    providers: payload.providers
  });
  let scene = findInitialScene(state, providersById);
  let showValidation = false;
  let runtimeError = '';
  let autoSaveTimer = 0;
  let providerScroller = null;
  let currentScrollbar = null;

  const root = document.getElementById('app');
  const modal = createModal({ closeLabel: strings.common.close });
  document.body.append(modal.element);

  // ── Splash screen ──────────────────────────────────────────────────────────
  function showSplash() {
    const { element, done } = createLogoLoader({ logoPath: payload.logoPath, duration: 5000 });
    root.replaceChildren(element);
    return done;
  }

  // ── Step transition ────────────────────────────────────────────────────────
  function transitionScene(next) {
    return new Promise((resolve) => {
      const wrapper = root.querySelector('.setup-stage-wrapper');
      if (!wrapper) {
        next();
        resolve();
        return;
      }
      wrapper.classList.add('is-leaving');
      setTimeout(() => {
        next();
        resolve();
      }, 230);
    });
  }

  function persistDraft() {
    window.clearTimeout(autoSaveTimer);

    autoSaveTimer = window.setTimeout(async () => {
      try {
        const serialized = serializeSetupState(state, providersById);
        await window.JoaniumSetup.saveDraft(serialized);
      } catch {
        runtimeError = strings.paths.localDataFile;
        render();
      }
    }, 220);
  }

  function patchState(mutator, { rerender = true } = {}) {
    const nextState = structuredClone(state);
    mutator(nextState);
    nextState.lastCompletedStep = calculateLastCompletedStep(nextState, providersById);
    state = nextState;
    runtimeError = '';
    persistDraft();

    if (rerender) {
      render();
    }
  }

  async function goNext() {
    if (!validateStep(scene, state, providersById)) {
      showValidation = true;
      render();
      return;
    }

    showValidation = false;
    const stepIndex = setupStepIds.indexOf(scene);

    if (stepIndex < setupStepIds.length - 1) {
      scene = setupStepIds[stepIndex + 1];
      await transitionScene(() => render());
    }
  }

  async function completeOnboarding() {
    if (!validateStep('usage', state, providersById)) {
      scene = 'usage';
      showValidation = true;
      await transitionScene(() => render());
      return;
    }

    try {
      const completedState = {
        ...serializeSetupState(state, providersById),
        onboardingCompleted: true
      };
      await window.JoaniumSetup.complete(completedState);
    } catch {
      runtimeError = strings.paths.localDataFile;
      render();
    }
  }

  function getStageMessage() {
    if (runtimeError) {
      return `Could not update ${runtimeError}.`;
    }

    if (showValidation && scene !== 'workspace') {
      return strings.flow.validation[scene] ?? '';
    }

    return '';
  }

  function renderConsentScene() {
    const stage = createElement('section', 'setup-stage');
    stage.append(
      createElement('span', 'setup-stage__eyebrow', strings.consent.eyebrow),
      createElement('h1', 'setup-stage__title', strings.consent.title),
      createElement('p', 'setup-stage__description', strings.consent.description)
    );

    const checkbox = createCheckbox({
      label: strings.consent.checkboxLabel,
      description: strings.consent.checkboxDescription,
      checked: state.consentAccepted,
      onChange: (nextChecked) => {
        patchState((draft) => {
          draft.consentAccepted = nextChecked;
        }, { rerender: false });
        const startButton = root.querySelector('.setup-stage__actions .joanium-button');
        if (startButton) {
          startButton.disabled = !nextChecked;
        }
      }
    });

    const links = createElement('div', 'setup-inline-links');
    links.append(
      createElement('span', 'setup-inline-links__prefix', strings.consent.reviewPrefix),
      createButton({
        label: strings.consent.termsLink,
        variant: 'ghost',
        size: 'compact',
        onClick: () => {
          modal.open({
            title: strings.documents.terms.title,
            nodes: createDocumentNodes(strings.documents.terms)
          });
        }
      }),
      createElement('span', 'setup-inline-links__joiner', strings.consent.reviewJoiner),
      createButton({
        label: strings.consent.privacyLink,
        variant: 'ghost',
        size: 'compact',
        onClick: () => {
          modal.open({
            title: strings.documents.privacy.title,
            nodes: createDocumentNodes(strings.documents.privacy)
          });
        }
      })
    );

    stage.append(checkbox, links);
    return stage;
  }

  function renderNameScene() {
    const stage = createElement('section', 'setup-stage');
    stage.append(
      createElement('h1', 'setup-stage__title', strings.name.title),
      createElement('p', 'setup-stage__description', strings.name.description)
    );

    const nameInput = createInputBox({
      label: strings.name.inputLabel,
      value: state.profile.name,
      placeholder: strings.name.inputPlaceholder,
      description: strings.name.helper,
      focusKey: 'profile.name',
      autoFocus: true,
      onInput: (value) => {
        patchState((draft) => {
          draft.profile.name = value;
        }, { rerender: false });
      },
      onKeyDown: (event) => {
        if (event.key === 'Enter') {
          goNext();
        }
      }
    });

    stage.append(nameInput.element);
    return stage;
  }

  function renderDobScene() {
    const stage = createElement('section', 'setup-stage');
    stage.append(
      createElement('h1', 'setup-stage__title', strings.dob.title),
      createElement('p', 'setup-stage__description', strings.dob.description)
    );

    const grid = createElement('div', 'setup-date-grid');
    const dayInput = createInputBox({
      label: strings.dob.dayLabel,
      value: state.profile.dateOfBirth.day,
      placeholder: strings.dob.dayPlaceholder,
      focusKey: 'profile.dob.day',
      inputMode: 'numeric',
      maxLength: 2,
      onInput: (value) => {
        patchState((draft) => {
          draft.profile.dateOfBirth.day = value.replace(/\D/g, '').slice(0, 2);
        }, { rerender: false });
      }
    });
    const yearInput = createInputBox({
      label: strings.dob.yearLabel,
      value: state.profile.dateOfBirth.year,
      placeholder: strings.dob.yearPlaceholder,
      description: strings.dob.helper,
      focusKey: 'profile.dob.year',
      inputMode: 'numeric',
      maxLength: 4,
      onInput: (value) => {
        patchState((draft) => {
          draft.profile.dateOfBirth.year = value.replace(/\D/g, '').slice(0, 4);
        }, { rerender: false });
      }
    });

    grid.append(
      dayInput.element,
      createMonthPicker({
        strings,
        selectedValue: state.profile.dateOfBirth.month,
        onSelect: (value) => {
          patchState((draft) => {
            draft.profile.dateOfBirth.month = value;
          });
        }
      }),
      yearInput.element
    );
    stage.append(grid);
    return stage;
  }

  function renderProviderConfig(provider) {
    const providerDetails = state.providers.details[provider.id];
    const card = createElement('section', 'setup-provider-detail-card');
    card.append(createProviderIdentity(provider, strings));

    const setupSection = createElement('section', 'setup-provider-config__section');
    setupSection.append(
      createElement('span', 'setup-provider-config__label', strings.providers.setupLabel)
    );

    for (const requirement of provider.requirements) {
      const labelTemplate =
        requirement.kind === 'secret'
          ? strings.providers.apiKeyLabel
          : strings.providers.localEndpointLabel;
      const placeholderTemplate =
        requirement.kind === 'secret'
          ? strings.providers.apiKeyPlaceholder
          : strings.providers.localEndpointPlaceholder;

      if (requirement.kind === 'secret') {
        const secretInput = createApiKeyInput({
          label: formatText(labelTemplate, { provider: provider.label }),
          value: providerDetails.apiKey ?? '',
          placeholder: placeholderTemplate,
          description: strings.providers.helper,
          focusKey: `providers.${provider.id}.apiKey`,
          revealLabel: strings.common.show,
          hideLabel: strings.common.hide,
          onInput: (value) => {
            patchState((draft) => {
              draft.providers.details[provider.id].apiKey = value;
            }, { rerender: false });
          }
        });
        setupSection.append(secretInput.element);
      } else {
        const endpointInput = createInputBox({
          label: formatText(labelTemplate, { provider: provider.label }),
          value: providerDetails.endpoint ?? provider.endpoint,
          placeholder: placeholderTemplate,
          description: strings.providers.localEndpointHelper,
          focusKey: `providers.${provider.id}.endpoint`,
          type: 'url',
          inputMode: 'url',
          onInput: (value) => {
            patchState((draft) => {
              draft.providers.details[provider.id].endpoint = value;
            }, { rerender: false });
          }
        });
        setupSection.append(endpointInput.element);
      }
    }

    card.append(setupSection);
    return card;
  }

  function syncProviderDetailSection(stage) {
    const DETAIL_SLOT = 'setup-provider-detail-slot';

    const existing = stage.querySelector(`.${DETAIL_SLOT}`);
    if (existing) {
      existing.remove();
    }

    if (state.providers.selected.length === 0) {
      return;
    }

    const slot = createElement('div', DETAIL_SLOT);

    slot.append(
      createElement(
        'span',
        'setup-provider-config__label setup-provider-config__label--selected',
        strings.providers.selectedProvidersLabel
      )
    );

    const detailGrid = createElement('div', 'setup-provider-detail-grid');

    for (const providerId of state.providers.selected) {
      const provider = providersById.get(providerId);

      if (provider) {
        detailGrid.append(renderProviderConfig(provider));
      }
    }

    slot.append(detailGrid);

    // Insert right before the security card so layout order is preserved
    const securityCard = stage.querySelector('.setup-security-card');
    stage.insertBefore(slot, securityCard);
  }

  function renderProvidersScene() {
    const stage = createElement('section', 'setup-stage setup-stage--providers');
    stage.append(
      createElement('h1', 'setup-stage__title', strings.providers.title),
      createElement('p', 'setup-stage__description', strings.providers.description)
    );

    providerScroller?.dispose?.();
    providerScroller = createProviderScroller({
      providers: payload.providers,
      selectedProviderIds: state.providers.selected,
      onToggle: (_providerId, selectedProviderIds) => {
        patchState((draft) => {
          draft.providers.selected = selectedProviderIds;
        }, { rerender: false });
        syncProviderDetailSection(stage);
      }
    });
    stage.append(providerScroller);

    const securityCard = createElement('div', 'setup-security-card');
    securityCard.append(
      createElement('span', 'setup-security-card__title', strings.providers.securityTitle),
      createElement('p', 'setup-security-card__body', strings.providers.securityBody)
    );
    stage.append(securityCard);

    syncProviderDetailSection(stage);

    return stage;
  }

  function renderUsageScene() {
    const stage = createElement('section', 'setup-stage');
    stage.append(
      createElement('h1', 'setup-stage__title', strings.usage.title),
      createElement('p', 'setup-stage__description', strings.usage.description)
    );

    const selector = createTagSelector({
      options: strings.usage.options,
      selectedValues: state.usageModes,
      onToggle: (optionId, nextIsSelected) => {
        patchState((draft) => {
          if (nextIsSelected) {
            draft.usageModes = [...new Set([...draft.usageModes, optionId])];
          } else {
            draft.usageModes = draft.usageModes.filter((item) => item !== optionId);
          }
        });
      }
    });

    stage.append(selector);
    return stage;
  }

  function renderWelcomeScene() {
    const stage = createElement('section', 'setup-stage setup-stage--welcome');
    stage.append(
      createElement(
        'h1',
        'setup-stage__title',
        formatText(strings.welcome.title, {
          name: state.profile.name || strings.appName,
          appName: strings.appName
        })
      ),
      createElement(
        'p',
        'setup-stage__description',
        formatText(strings.welcome.description, {
          appName: strings.appName
        })
      )
    );

    const featureGrid = createElement('div', 'setup-feature-grid');
    for (const feature of strings.welcome.features) {
      const card = createElement('article', 'setup-feature-card');
      card.append(
        createElement('span',  'setup-feature-card__icon',  feature.icon),
        createElement('strong','setup-feature-card__title', feature.title),
        createElement('p',     'setup-feature-card__body',  feature.body)
      );
      featureGrid.append(card);
    }
    stage.append(featureGrid);

    return stage;
  }

  function renderStage() {
    if (scene === 'consent') {
      return renderConsentScene();
    }

    if (scene === 'name') {
      return renderNameScene();
    }

    if (scene === 'dob') {
      return renderDobScene();
    }

    if (scene === 'providers') {
      return renderProvidersScene();
    }

    if (scene === 'usage') {
      return renderUsageScene();
    }

    return renderWelcomeScene();
  }

  function appendActionArea(stage) {
    const message = getStageMessage();

    if (message) {
      stage.append(createElement('div', 'setup-stage__message', message));
    }

    const actions = createElement('div', 'setup-stage__actions');
    const isFinalStep = scene === 'welcome';
    actions.append(
      createButton({
        label: scene === 'consent' ? strings.common.start : isFinalStep ? strings.common.letGo : strings.common.next,
        variant: 'primary',
        disabled: scene === 'consent' ? !state.consentAccepted : false,
        onClick: isFinalStep ? completeOnboarding : goNext
      })
    );
    stage.append(actions);
  }

  function render() {
    const focusState = captureFocusState(root);
    const shell = createElement('main', 'setup-shell');
    const body = createElement('section', 'setup-shell__body');
    const stage = renderStage();

    appendActionArea(stage);

    const stageWrapper = createElement('div', 'setup-stage-wrapper');
    stageWrapper.append(stage);
    body.append(stageWrapper);
    shell.append(body);

    // Dispose previous scrollbar before wiping the DOM
    currentScrollbar?.dispose();
    currentScrollbar = null;

    root.replaceChildren(shell);
    restoreFocusState(root, focusState);

    // Attach AFTER elements are in the DOM so the first measurement is accurate
    currentScrollbar = attachCustomScrollbar(stageWrapper, stage, { top: 34, bottom: 34, right: 12 });
  }

  await showSplash();
  render();
}

bootstrap();
