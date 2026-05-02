export function createModal({ closeLabel }) {
  const overlay = document.createElement('div');
  overlay.className = 'joanium-modal';

  const panel = document.createElement('section');
  panel.className = 'joanium-modal__panel';

  const header = document.createElement('header');
  header.className = 'joanium-modal__header';

  const titleNode = document.createElement('h3');
  titleNode.className = 'joanium-modal__title';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'joanium-modal__close';
  closeButton.textContent = closeLabel;

  const body = document.createElement('div');
  body.className = 'joanium-modal__body';

  header.append(titleNode, closeButton);
  panel.append(header, body);
  overlay.append(panel);

  function close() {
    overlay.classList.remove('is-open');
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close();
    }
  });

  return {
    element: overlay,
    open({ title, nodes }) {
      titleNode.textContent = title;
      body.replaceChildren(...nodes);
      overlay.classList.add('is-open');
    },
    close
  };
}
