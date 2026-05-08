import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc }                  from '../../Shared/Ipc/RendererIpc.js';
import { iconMarkup }                  from '../../Shared/Icons/Icons.js';

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
    const mmdd  = match[2].padStart(4, '0');
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
    const info   = await invokeIpc('about:get-info');
    const system = info.system ?? {};

    const nameEl    = createElement('h1', 'chat-profile__about-name', info.name || 'Joanium');
    const versionEl = createElement(
      'p',
      'chat-profile__about-version',
      formatText(strings.version, { version: info.version || '' })
    );
    const descEl = createElement('p', 'chat-profile__about-desc', info.description || '');

    // ── Social bar ─────────────────────────────────────────────────────────
    const socialBar = createElement('div', 'chat-profile__about-social');

    const socialLinks = [
      { icon: 'globe',     url: 'https://www.joanium.com',               title: 'Website'   },
      { icon: 'github',    url: 'https://github.com/joanium',          title: 'GitHub'    },
      { icon: 'discord',   url: 'https://discord.com/invite/5yHKxxx5fK', title: 'Discord'   },
      { icon: 'x',         url: 'https://x.com/joanium',               title: 'X'         },
      { icon: 'instagram', url: 'https://instagram.com/joaniumhere',        title: 'Instagram' },
    ];

    for (const { icon, url, title } of socialLinks) {
      const link   = createElement('a', 'chat-profile__about-social-link');
      link.title   = title;
      link.href    = '#';
      const iconEl = createElement('span', 'chat-profile__about-social-icon');
      iconEl.innerHTML = iconMarkup[icon] ?? '';
      link.append(iconEl);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        void invokeIpc('about:open-external', url);
      });
      socialBar.append(link);
    }

    const sponsorBtn = createElement('a', 'chat-profile__about-sponsor');
    sponsorBtn.title = strings.sponsor;
    sponsorBtn.href  = '#';
    const heartEl    = createElement('span', 'chat-profile__about-social-icon');
    heartEl.innerHTML = iconMarkup.heart ?? '';
    sponsorBtn.append(heartEl);
    sponsorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      void invokeIpc('about:open-external', strings.sponsorUrl);
    });
    socialBar.append(sponsorBtn);

    // ── Left column — app meta ─────────────────────────────────────────────
    const metaCard = createElement('div', 'chat-profile__about-meta');
    for (const { label, value } of [
      { label: strings.author,      value: info.author || '' },
      { label: strings.lastUpdated, value: parseBuildDate(info.version) || '—' },
    ]) {
      const row = createElement('div', 'chat-profile__about-meta-row');
      row.append(
        createElement('span', 'chat-profile__about-meta-label', label),
        createElement('span', 'chat-profile__about-meta-value', value)
      );
      metaCard.append(row);
    }

    const leftCol = createElement('div', 'chat-profile__about-col chat-profile__about-col--left');
    leftCol.append(metaCard);

    // ── Right column — system info ─────────────────────────────────────────
    const systemCard = createElement('div', 'chat-profile__about-meta');
    const osVersion  = system.osVersion || '';
    const osName     = system.osName    || '';
    const osDisplay  = osVersion.startsWith(osName) ? osVersion : [osName, osVersion].filter(Boolean).join(' ');

    const systemRows = [
      {
        label: strings.os,
        value: [osDisplay, system.arch].filter(Boolean).join(' ')
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

    const rightCol = createElement('div', 'chat-profile__about-col chat-profile__about-col--right');
    rightCol.append(systemCard);

    // ── Two-column row ────────────────────────────────────────────────────────
    const columnsRow = createElement('div', 'chat-profile__about-columns');
    columnsRow.append(leftCol, rightCol);

    view.replaceChildren(nameEl, versionEl, descEl, socialBar, columnsRow);
  }

  return {
    element: view,
    populate
  };
}
