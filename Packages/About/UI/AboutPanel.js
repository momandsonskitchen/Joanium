import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

export function createAboutPanel(strings) {
  const view = createElement('div', 'chat-profile__about');

  async function populate() {
    const info = await invokeIpc('about:get-info');
    const nameEl = createElement('h1', 'chat-profile__about-name', info.name || 'Joanium');
    const versionEl = createElement(
      'p',
      'chat-profile__about-version',
      formatText(strings.version, { version: info.version || '' })
    );
    const descEl = createElement('p', 'chat-profile__about-desc', info.description || '');
    const metaCard = createElement('div', 'chat-profile__about-meta');

    for (const { label, value } of [
      { label: strings.author, value: info.author || '' },
      { label: strings.license, value: info.license || '' },
      { label: strings.framework, value: info.framework || '' }
    ]) {
      const row = createElement('div', 'chat-profile__about-meta-row');
      row.append(
        createElement('span', 'chat-profile__about-meta-label', label),
        createElement('span', 'chat-profile__about-meta-value', value)
      );
      metaCard.append(row);
    }

    const sponsorBtn = createElement('a', 'chat-profile__about-sponsor', strings.sponsor);
    sponsorBtn.href = '#';
    sponsorBtn.addEventListener('click', (event) => {
      event.preventDefault();
      void invokeIpc('about:open-external', strings.sponsorUrl);
    });

    view.replaceChildren(nameEl, versionEl, descEl, metaCard, sponsorBtn);
  }

  return {
    element: view,
    populate
  };
}
