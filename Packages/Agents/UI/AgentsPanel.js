import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { collapseWhitespace } from '../../Shared/Utils/StringUtils.js';
import { createSearchBar } from '../../Shared/SearchBar/SearchBar.js';
import { createIcon } from '../../Shared/Icons/Icons.js';
import { createInputBoxLite } from '../../Shared/InputBoxLite/InputBoxLite.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createAgentId(name) {
  const sanitized = (name || 'Agent').trim()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'Agent';
  const unique = Math.random().toString(36).slice(2, 7).padEnd(5, '0');
  return `${sanitized}-${unique}`;
}

function pickRandomItem(array) {
  if (!array.length) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function buildScheduleDescription(schedule, strings) {
  if (!schedule) return strings.scheduleTypes.startup;
  const time = schedule.time ?? '09:00';
  switch (schedule.type) {
    case 'startup':
      return strings.scheduleStartup;
    case 'daily':
      return formatText(strings.scheduleDaily, { time });
    case 'weekly': {
      const day = strings.days[schedule.day ?? 1];
      return formatText(strings.scheduleWeekly, { day, time });
    }
    case 'weekdays':
      return formatText(strings.scheduleWeekdays, { time });
    case 'weekends':
      return formatText(strings.scheduleWeekends, { time });
    default:
      return strings.scheduleTypes.startup;
  }
}

// ---------------------------------------------------------------------------
// createAgentsPanel
//
// Factory that builds and manages the Agents sidebar panel.
// Accepts the `agents` i18n namespace so the caller controls locale.
//
// Returns:
//   build()        — builds and returns the panel HTMLElement (call once)
//   populateList() — re-fetches and renders the agent cards
// ---------------------------------------------------------------------------

export function createAgentsPanel(strings) {
  // Panel-scoped draft state
  let draftName         = '';
  let draftAvatar       = null; // null = random; string = filename like '1.png'
  let draftScheduleType = 'startup';
  let draftTime         = '09:00';
  let draftDay          = 1; // Monday
  let draftPrompt       = '';
  let editingAgentId    = null;
  let editingCreatedAt  = null;

  // All available avatars fetched from the main process
  let availableAvatars = [];

  // DOM refs
  let panelRef     = null;
  let avatarGridEl = null;
  let timeRowEl    = null;
  let dayRowEl     = null;
  let saveBtnRef   = null;
  let formHeadingRef = null;

  // ── Avatar grid ────────────────────────────────────────────────────────────

  function buildAvatarGrid() {
    const wrapper = createElement('div', 'agents-form__avatar-section');
    const label   = createElement('label', 'agents-form__field-label', strings.avatarLabel);
    wrapper.append(label);

    avatarGridEl = createElement('div', 'agents-form__avatar-grid');

    // "Random" tile (always first)
    const randomTile = createElement('button', 'agents-form__avatar-tile agents-form__avatar-tile--random');
    randomTile.type = 'button';
    randomTile.setAttribute('aria-label', strings.avatarRandom);
    randomTile.append(createElement('span', 'agents-form__avatar-random-label', strings.avatarRandom));
    randomTile.addEventListener('click', () => selectAvatar(null));
    avatarGridEl.append(randomTile);

    wrapper.append(avatarGridEl);
    return wrapper;
  }

  async function loadAvatars() {
    try {
      availableAvatars = await window.JoaniumChat.listAgentAvatars();
    } catch {
      availableAvatars = [];
    }

    if (!avatarGridEl) return;

    // Clear existing image tiles (keep the random tile at index 0)
    const existingTiles = avatarGridEl.querySelectorAll('.agents-form__avatar-tile--image');
    for (const tile of existingTiles) tile.remove();

    for (const avatar of availableAvatars) {
      const tile = createElement('button', 'agents-form__avatar-tile agents-form__avatar-tile--image');
      tile.type = 'button';
      tile.setAttribute('aria-label', avatar.filename);
      tile._avatarFilename = avatar.filename;

      const img = document.createElement('img');
      img.src = `file://${avatar.filePath.replace(/\\/g, '/')}`;
      img.className = 'agents-form__avatar-img';
      img.alt = avatar.filename;
      // Prevent drag
      img.draggable = false;
      tile.append(img);

      tile.addEventListener('click', () => selectAvatar(avatar.filename));
      avatarGridEl.append(tile);
    }

    syncAvatarTileSelection();
  }

  function selectAvatar(filename) {
    draftAvatar = filename; // null = random
    syncAvatarTileSelection();
  }

  function syncAvatarTileSelection() {
    if (!avatarGridEl) return;
    const tiles = avatarGridEl.querySelectorAll('.agents-form__avatar-tile');
    for (const tile of tiles) {
      const isRandom = tile.classList.contains('agents-form__avatar-tile--random');
      const isSelected = isRandom
        ? draftAvatar === null
        : tile._avatarFilename === draftAvatar;
      tile.classList.toggle('agents-form__avatar-tile--selected', isSelected);
    }
  }

  // ── Schedule section ───────────────────────────────────────────────────────

  function buildScheduleSection() {
    const wrapper = createElement('div', 'agents-form__schedule-section');
    const label   = createElement('label', 'agents-form__field-label', strings.scheduleLabel);
    wrapper.append(label);

    // Type toggle row
    const typeRow = createElement('div', 'agents-form__schedule-types');
    const scheduleTypes = ['startup', 'daily', 'weekly', 'weekdays', 'weekends'];
    for (const type of scheduleTypes) {
      const btn = createElement('button', 'agents-form__schedule-type-btn');
      btn.type = 'button';
      btn.textContent = strings.scheduleTypes[type];
      btn._scheduleType = type;
      btn.addEventListener('click', () => {
        draftScheduleType = type;
        syncScheduleTypeButtons(typeRow);
        syncScheduleConditionals();
      });
      typeRow.append(btn);
    }
    wrapper.append(typeRow);

    // Time input row (hidden for startup)
    timeRowEl = createElement('div', 'agents-form__schedule-time-row');
    const timeBox = createInputBoxLite({
      label: strings.timeLabel,
      labelClassName: 'agents-form__field-label',
      className: 'agents-form__time-input',
      placeholder: strings.timePlaceholder,
      type: 'time',
      value: draftTime,
      onInput: (value) => { draftTime = value || '09:00'; }
    });
    timeRowEl.append(timeBox.element);
    wrapper.append(timeRowEl);

    // Day-of-week row (only for weekly)
    dayRowEl = createElement('div', 'agents-form__schedule-day-row');
    const dayLabel = createElement('label', 'agents-form__field-label', strings.dayLabel);
    const dayPicker = createElement('div', 'agents-form__day-picker');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 0; d < 7; d++) {
      const dayBtn = createElement('button', 'agents-form__day-btn');
      dayBtn.type = 'button';
      dayBtn.textContent = dayNames[d];
      dayBtn._dayIndex = d;
      dayBtn.addEventListener('click', () => {
        draftDay = d;
        syncDayButtons(dayPicker);
      });
      dayPicker.append(dayBtn);
    }
    dayRowEl.append(dayLabel, dayPicker);
    wrapper.append(dayRowEl);

    syncScheduleTypeButtons(typeRow);
    syncScheduleConditionals();
    syncDayButtons(dayPicker);

    return wrapper;
  }

  function syncScheduleTypeButtons(typeRow) {
    for (const btn of typeRow.querySelectorAll('.agents-form__schedule-type-btn')) {
      btn.classList.toggle(
        'agents-form__schedule-type-btn--active',
        btn._scheduleType === draftScheduleType
      );
    }
  }

  function syncScheduleConditionals() {
    if (!timeRowEl || !dayRowEl) return;
    const needsTime = draftScheduleType !== 'startup';
    const needsDay  = draftScheduleType === 'weekly';
    timeRowEl.hidden = !needsTime;
    dayRowEl.hidden  = !needsDay;
  }

  function syncDayButtons(dayPicker) {
    for (const btn of dayPicker.querySelectorAll('.agents-form__day-btn')) {
      btn.classList.toggle('agents-form__day-btn--active', btn._dayIndex === draftDay);
    }
  }

  // ── Form save/cancel ───────────────────────────────────────────────────────

  function syncSaveBtn() {
    if (!saveBtnRef) return;
    saveBtnRef.disabled = !draftName.trim() || !draftPrompt.trim();
  }

  function syncFormChrome() {
    if (formHeadingRef) {
      formHeadingRef.textContent = editingAgentId
        ? strings.editAgentHeading
        : strings.newAgentHeading;
    }
    if (saveBtnRef) {
      saveBtnRef.textContent = editingAgentId ? strings.update : strings.save;
    }
  }

  function resetForm() {
    editingAgentId   = null;
    editingCreatedAt = null;
    draftName        = '';
    draftAvatar      = null;
    draftScheduleType = 'startup';
    draftTime        = '09:00';
    draftDay         = 1;
    draftPrompt      = '';

    // Reset DOM inputs via stored refs
    if (panelRef) {
      const nameInput   = panelRef.querySelector('.agents-form__name-input');
      const timeInput   = panelRef.querySelector('.agents-form__time-input');
      const promptTA    = panelRef.querySelector('.agents-form__prompt-textarea');
      const typeRow     = panelRef.querySelector('.agents-form__schedule-types');
      const dayPicker   = panelRef.querySelector('.agents-form__day-picker');

      if (nameInput)  nameInput.value  = '';
      if (timeInput)  timeInput.value  = '09:00';
      if (promptTA)   promptTA.value   = '';
      if (typeRow)  { syncScheduleTypeButtons(typeRow); }
      if (dayPicker){ syncDayButtons(dayPicker); }
    }

    syncAvatarTileSelection();
    syncScheduleConditionals();
    syncSaveBtn();
    syncFormChrome();
  }

  function applyAgentToForm(agent) {
    editingAgentId   = agent.id;
    editingCreatedAt = agent.createdAt ?? null;
    draftName        = agent.name     ?? '';
    draftAvatar      = agent.avatar   ?? null;
    draftPrompt      = agent.prompt   ?? '';

    const schedule   = agent.schedule ?? { type: 'startup' };
    draftScheduleType = schedule.type ?? 'startup';
    draftTime         = schedule.time ?? '09:00';
    draftDay          = schedule.day  ?? 1;

    if (panelRef) {
      const nameInput = panelRef.querySelector('.agents-form__name-input');
      const timeInput = panelRef.querySelector('.agents-form__time-input');
      const promptTA  = panelRef.querySelector('.agents-form__prompt-textarea');
      const typeRow   = panelRef.querySelector('.agents-form__schedule-types');
      const dayPicker = panelRef.querySelector('.agents-form__day-picker');

      if (nameInput)  { nameInput.value = draftName;  }
      if (timeInput)  { timeInput.value = draftTime;  }
      if (promptTA)   { promptTA.value  = draftPrompt; }
      if (typeRow)    { syncScheduleTypeButtons(typeRow); }
      if (dayPicker)  { syncDayButtons(dayPicker); }
    }

    syncAvatarTileSelection();
    syncScheduleConditionals();
    syncSaveBtn();
    syncFormChrome();

    // Focus name field
    panelRef?.querySelector('.agents-form__name-input')?.focus();
  }

  // ── Card builder ───────────────────────────────────────────────────────────

  function resolveAvatarSrc(agent) {
    if (!agent.avatar) {
      const random = pickRandomItem(availableAvatars);
      return random ? `file://${random.filePath.replace(/\\/g, '/')}` : null;
    }
    const found = availableAvatars.find((a) => a.filename === agent.avatar);
    return found ? `file://${found.filePath.replace(/\\/g, '/')}` : null;
  }

  function buildCard(agent, listEl) {
    const card = createElement('div', 'agents-card');

    // Avatar
    const avatarEl = createElement('div', 'agents-card__avatar');
    const avatarSrc = resolveAvatarSrc(agent);
    if (avatarSrc) {
      const img = document.createElement('img');
      img.src       = avatarSrc;
      img.alt       = agent.name;
      img.className = 'agents-card__avatar-img';
      img.draggable = false;
      avatarEl.append(img);
    } else {
      // Fallback initials
      const initials = (agent.name || 'A').slice(0, 2).toUpperCase();
      avatarEl.append(createElement('span', 'agents-card__avatar-initials', initials));
    }

    // Body
    const body     = createElement('div', 'agents-card__body');
    const nameEl   = createElement('div', 'agents-card__name', agent.name);
    const schedEl  = createElement('div', 'agents-card__schedule',
      buildScheduleDescription(agent.schedule, strings));
    const promptEl = createElement('div', 'agents-card__prompt', agent.prompt);
    body.append(nameEl, schedEl, promptEl);

    // Actions
    const actions = createElement('div', 'agents-card__actions');

    const runBtn = createElement('button', 'agents-card__btn');
    runBtn.type  = 'button';
    runBtn.setAttribute('aria-label', strings.run);
    runBtn.append(createIcon('send', 'agents-card__btn-icon'));
    runBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      runBtn.disabled = true;
      try {
        await window.JoaniumChat.runAgent(agent.id);
      } catch (err) {
        console.error('[Joanium] Failed to run agent:', err);
      } finally {
        runBtn.disabled = false;
      }
    });

    const editBtn = createElement('button', 'agents-card__btn');
    editBtn.type  = 'button';
    editBtn.setAttribute('aria-label', strings.edit);
    editBtn.append(createIcon('pencil', 'agents-card__btn-icon'));
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const full = await window.JoaniumChat.loadAgent(agent.id);
        panelRef?._startEdit(full);
      } catch (err) {
        console.error('[Joanium] Failed to load agent for editing:', err);
      }
    });

    const deleteBtn = createElement('button', 'agents-card__btn agents-card__btn--danger');
    deleteBtn.type  = 'button';
    deleteBtn.setAttribute('aria-label', strings.delete);
    deleteBtn.append(createIcon('trash', 'agents-card__btn-icon'));
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.JoaniumChat.deleteAgent(agent.id);
      } catch (err) {
        console.error('[Joanium] Failed to delete agent:', err);
      }
      if (editingAgentId === agent.id) panelRef?._resetForm();
      await populateList(listEl, panelRef?._search.getValue().trim() ?? '');
    });

    actions.append(runBtn, editBtn, deleteBtn);
    card.append(avatarEl, body, actions);
    return card;
  }

  // ── populateList ───────────────────────────────────────────────────────────

  async function populateList(listEl, query = '') {
    listEl.replaceChildren();
    for (let i = 0; i < 3; i++) {
      listEl.append(createElement('div', 'agents-skeleton'));
    }

    let agents;
    try {
      agents = await window.JoaniumChat.listAgents();
    } catch {
      agents = [];
    }

    const normalizedQuery = collapseWhitespace(query).toLowerCase();
    const filtered = normalizedQuery
      ? agents.filter((a) => {
          const haystack = [a.name, a.prompt]
            .map((v) => collapseWhitespace(v ?? '').toLowerCase())
            .join('\n');
          return haystack.includes(normalizedQuery);
        })
      : agents;

    listEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = createElement('div', 'agents-empty');
      empty.append(
        createElement('p', 'agents-empty__title',
          normalizedQuery ? strings.noResults : strings.empty),
        createElement('p', 'agents-empty__hint',
          normalizedQuery ? strings.noResultsHint : strings.emptyHint)
      );
      listEl.append(empty);
      return;
    }

    for (const agent of filtered) {
      listEl.append(buildCard(agent, listEl));
    }
  }

  // ── build ──────────────────────────────────────────────────────────────────

  function build() {
    const panel = createElement('div', 'agents-panel');
    panel.hidden = true;

    // Header
    const header = createElement('div', 'agents-panel__header');
    const headerCopy = createElement('div', 'agents-panel__header-copy');
    headerCopy.append(
      createElement('h2', 'agents-panel__title', strings.title),
      createElement('p', 'agents-panel__subtitle', strings.subtitle)
    );
    header.append(headerCopy);
    panel.append(header);

    // Body
    const body = createElement('div', 'agents-panel__body');

    // ── Left: form ────────────────────────────────────────────────────────
    const formCol = createElement('div', 'agents-form-col');

    formHeadingRef = createElement('p', 'agents-form__heading', strings.newAgentHeading);
    formCol.append(formHeadingRef);

    const formCard = createElement('div', 'agents-form__card');

    // Name
    const nameBox = createInputBoxLite({
      label: strings.nameLabel,
      labelClassName: 'agents-form__field-label',
      className: 'agents-form__name-input',
      placeholder: strings.namePlaceholder,
      onInput: (value) => { draftName = value; syncSaveBtn(); }
    });
    formCard.append(nameBox.element);

    // Avatar picker
    const avatarSection = buildAvatarGrid();
    formCard.append(avatarSection);

    // Schedule
    const scheduleSection = buildScheduleSection();
    formCard.append(scheduleSection);

    // Prompt
    const promptLabel = createElement('label', 'agents-form__field-label', strings.promptLabel);
    const promptTextarea = document.createElement('textarea');
    promptTextarea.className   = 'agents-form__prompt-textarea';
    promptTextarea.placeholder = strings.promptPlaceholder;
    promptTextarea.rows        = 5;
    promptTextarea.style.webkitUserSelect = 'text';
    promptTextarea.style.userSelect       = 'text';
    promptTextarea.style.cursor           = 'text';
    promptTextarea.addEventListener('input', (e) => {
      draftPrompt = e.target.value;
      syncSaveBtn();
    });
    formCard.append(promptLabel, promptTextarea);

    // Form actions
    const formActions = createElement('div', 'agents-form__actions');

    const cancelBtn = createElement('button', 'agents-form__btn-cancel');
    cancelBtn.type = 'button';
    cancelBtn.textContent = strings.cancel;
    cancelBtn.addEventListener('click', resetForm);

    saveBtnRef = createElement('button', 'agents-form__btn-save');
    saveBtnRef.type = 'button';
    saveBtnRef.disabled = true;
    saveBtnRef.textContent = strings.save;
    saveBtnRef.addEventListener('click', async () => {
      const name   = draftName.trim();
      const prompt = draftPrompt.trim();
      if (!name || !prompt) return;

      // Resolve avatar — pick random if none selected
      let avatar = draftAvatar;
      if (!avatar && availableAvatars.length > 0) {
        avatar = pickRandomItem(availableAvatars).filename;
      }

      const now = new Date().toISOString();
      const schedule = draftScheduleType === 'startup'
        ? { type: 'startup' }
        : draftScheduleType === 'weekly'
          ? { type: 'weekly',   time: draftTime, day: draftDay }
          : { type: draftScheduleType, time: draftTime };

      const agent = {
        id:        editingAgentId ?? createAgentId(name),
        name,
        avatar,
        schedule,
        prompt,
        createdAt: editingCreatedAt ?? now,
        updatedAt: now
      };

      try {
        await window.JoaniumChat.saveAgent(agent);
      } catch (err) {
        console.error('[Joanium] Failed to save agent:', err);
        return;
      }

      resetForm();
      await populateList(panel._listEl, panel._search.getValue().trim());
    });

    formActions.append(cancelBtn, saveBtnRef);
    formCard.append(formActions);
    formCol.append(formCard);

    // ── Right: list ───────────────────────────────────────────────────────
    const listCol = createElement('div', 'agents-list-col');
    listCol.append(createElement('p', 'agents-list__heading', strings.yourAgents));

    const searchWrap = createElement('div', 'agents-list__search');
    const search = createSearchBar({
      placeholder: strings.searchPlaceholder,
      onChange: (value) => void populateList(listContent, value.trim())
    });
    search.element.style.webkitAppRegion = 'no-drag';
    searchWrap.append(search.element);

    const listContent = createElement('div', 'agents-list__content');
    listCol.append(searchWrap, listContent);

    body.append(formCol, listCol);
    panel.append(body);

    // Attach public refs
    panel._listEl    = listContent;
    panel._search    = search;
    panel._startEdit = applyAgentToForm;
    panel._resetForm = resetForm;

    panelRef = panel;

    syncFormChrome();
    syncSaveBtn();

    // Load avatars asynchronously — grid renders when ready
    void loadAvatars();

    return panel;
  }

  return { build, populateList };
}
