export function createDialogBox({ confirmLabel, cancelLabel = '', onConfirm, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'joanium-dialog-box';

  const panel = document.createElement('div');
  panel.className = 'joanium-dialog-box__panel';
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-modal', 'true');

  const titleNode = document.createElement('h3');
  titleNode.className = 'joanium-dialog-box__title';

  const messageNode = document.createElement('p');
  messageNode.className = 'joanium-dialog-box__message';

  const actions = document.createElement('div');
  actions.className = 'joanium-dialog-box__actions';

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'joanium-dialog-box__button joanium-dialog-box__button--confirm';
  confirmButton.textContent = confirmLabel;

  if (cancelLabel) {
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'joanium-dialog-box__button joanium-dialog-box__button--cancel';
    cancelButton.textContent = cancelLabel;
    cancelButton.addEventListener('click', () => {
      close();
      if (typeof onCancel === 'function') onCancel();
    });
    actions.append(cancelButton);
  }

  actions.append(confirmButton);
  panel.append(titleNode, messageNode, actions);
  overlay.append(panel);

  function close() {
    overlay.classList.remove('is-open');
  }

  confirmButton.addEventListener('click', () => {
    close();
    if (typeof onConfirm === 'function') onConfirm();
  });

  function onWindowKeydown(event) {
    if (!overlay.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      close();
      if (typeof onCancel === 'function') onCancel();
    }
    if (event.key === 'Enter') {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    }
  }
  window.addEventListener('keydown', onWindowKeydown);

  return {
    element: overlay,
    open({ title, message, variant = 'default' }) {
      titleNode.textContent = title;
      messageNode.textContent = message;
      const safeVariant = String(variant).replace(/[^a-z0-9_-]/gi, '') || 'default';
      panel.className = `joanium-dialog-box__panel joanium-dialog-box__panel--${safeVariant}`;
      overlay.classList.add('is-open');
      confirmButton.focus();
    },
    close,
    destroy() {
      window.removeEventListener('keydown', onWindowKeydown);
    },
  };
}
