import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return '';
  const gb = value / 1024 / 1024 / 1024;
  return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
}

function parseBuildDate(version) {
  if (!version) return '';
  // Format: YYYY.MMDD.build — e.g. "2026.430.1" → year=2026, month=4, day=30
  const match = /^(\d{4})\.(\d{1,4})\./.exec(version);
  if (match) {
    const year  = Number(match[1]);
    const mmdd  = match[2].padStart(4, '0'); // ensure at least 4 chars
    const month = Number(mmdd.slice(0, -2));
    const day   = Number(mmdd.slice(-2));
    const date  = new Date(year, month - 1, day);
    if (!isNaN(date) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }
  return '';
}

export function createAboutPanel(strings) {
  const view = createElement('div', 'chat-profile__about');

  async function populate() {
    const info = await invokeIpc('about:get-info');
    const system = info.system ?? {};
    const nameEl = createElement('h1', 'chat-profile__about-name', info.name || 'Joanium');
    const versionEl = createElement(
      'p',
      'chat-profile__about-version',
      formatText(strings.version, { version: info.version || '' })
    );
    const descEl = createElement('p', 'chat-profile__about-desc', info.description || '');
    const metaCard = createElement('div', 'chat-profile__about-meta');

    for (const { label, value } of [
      { label: strings.author,      value: info.author || '' },
      { label: strings.lastUpdated, value: parseBuildDate(info.version) || '—' }
    ]) {
      const row = createElement('div', 'chat-profile__about-meta-row');
      row.append(
        createElement('span', 'chat-profile__about-meta-label', label),
        createElement('span', 'chat-profile__about-meta-value', value)
      );
      metaCard.append(row);
    }

    const systemTitle = createElement('h2', 'chat-profile__about-section-title', strings.system);
    const systemCard = createElement('div', 'chat-profile__about-meta');
    const systemRows = [
      {
        label: strings.os,
        value: [system.osName, system.osVersion, system.arch].filter(Boolean).join(' ')
      },
      {
        label: strings.cpu,
        value: [system.cpuModel, system.cpuCores ? `${system.cpuCores} cores` : ''].filter(Boolean).join(' ')
      },
      {
        label: strings.memory,
        value: formatBytes(system.totalMem)
      },
      {
        label: strings.locale,
        value: system.locale || ''
      },
      {
        label: strings.timezone,
        value: system.timezone || ''
      },
      {
        label: strings.runtime,
        value: [system.electron ? `Electron ${system.electron}` : '', system.node ? `Node ${system.node}` : '']
          .filter(Boolean)
          .join(' / ')
      }
    ];

    for (const { label, value } of systemRows) {
      const row = createElement('div', 'chat-profile__about-meta-row');
      row.append(
        createElement('span', 'chat-profile__about-meta-label', label),
        createElement('span', 'chat-profile__about-meta-value', value)
      );
      systemCard.append(row);
    }

    const sponsorBtn = createElement('a', 'chat-profile__about-sponsor', strings.sponsor);
    sponsorBtn.href = '#';
    sponsorBtn.addEventListener('click', (event) => {
      event.preventDefault();
      void invokeIpc('about:open-external', strings.sponsorUrl);
    });

    view.replaceChildren(nameEl, versionEl, descEl, metaCard, systemTitle, systemCard, sponsorBtn);
  }

  return {
    element: view,
    populate
  };
}
