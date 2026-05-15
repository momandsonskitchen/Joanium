import { createElement } from '../../Shared/Utils/DomUtils.js';
import { attachCustomScrollbar } from '../../Shared/CustomScrollbar/CustomScrollbar.js';
import { createIcon } from '../../Shared/Icons/Icons.js';

export function orderGitBranches(branches = [], current = '') {
  return [...new Set(branches.map((branch) => String(branch ?? '').trim()).filter(Boolean))].sort(
    (left, right) => {
      if (left === current) return -1;
      if (right === current) return 1;
      return left.localeCompare(right);
    },
  );
}

export function createGitBranchPickerPanel({ strings, onCreateBranch, onCheckoutBranch }) {
  const panel = createElement('div', 'chat-branch-picker');
  document.body.append(panel);

  const createRow = createElement('div', 'chat-branch-picker__create');
  const input = document.createElement('input');
  input.className = 'chat-branch-picker__input';
  input.type = 'text';
  input.placeholder = strings.git.createBranchPlaceholder;
  input.setAttribute('aria-label', strings.git.createBranch);
  input.autocomplete = 'off';
  input.spellcheck = false;

  const createButton = createElement(
    'button',
    'chat-branch-picker__create-button',
    strings.git.createBranch,
  );
  createButton.type = 'button';
  createRow.append(input, createButton);

  const status = createElement('p', 'chat-branch-picker__status');
  status.hidden = true;

  const list = createElement('div', 'chat-branch-picker__list');
  panel.append(createRow, status, list);

  let busy = false;

  function syncCreateButton() {
    createButton.disabled = busy || !String(input.value ?? '').trim();
  }

  function setBusy(nextBusy) {
    busy = nextBusy;
    input.disabled = busy;
    syncCreateButton();

    for (const option of list.querySelectorAll('.chat-branch-picker__option')) {
      option.disabled = busy;
    }
  }

  function setStatus(text = '', tone = '') {
    status.textContent = text;
    status.hidden = !text;
    status.className = tone
      ? `chat-branch-picker__status chat-branch-picker__status--${tone}`
      : 'chat-branch-picker__status';
  }

  function renderBranches({ current = '', branches = [] } = {}) {
    list.replaceChildren();

    if (!branches.length) {
      list.append(createElement('div', 'chat-branch-picker__empty', strings.git.noBranches));
      return;
    }

    for (const branch of branches) {
      const option = createElement('button', 'chat-branch-picker__option');
      option.type = 'button';
      option._branchName = branch;
      const active = branch === current;
      option.classList.toggle('chat-branch-picker__option--active', active);
      option.append(createElement('span', 'chat-branch-picker__option-label', branch));
      if (active) option.append(createIcon('check', 'chat-branch-picker__check'));
      option.addEventListener('click', (event) => {
        event.stopPropagation();
        void onCheckoutBranch(branch);
      });
      list.append(option);
    }

    setBusy(busy);
  }

  input.addEventListener('input', () => {
    syncCreateButton();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || createButton.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    void onCreateBranch(input.value);
  });
  createButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (createButton.disabled) return;
    void onCreateBranch(input.value);
  });

  const scrollbar = attachCustomScrollbar(panel, list, {
    top: 6,
    bottom: 6,
    right: 4,
    minThumb: 24,
  });
  syncCreateButton();

  return {
    element: panel,
    input,
    list,
    setBusy,
    setStatus,
    renderBranches,
    dispose() {
      scrollbar.dispose();
      panel.remove();
    },
  };
}
