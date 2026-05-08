    const systemCard = createElement('div', 'chat-profile__about-meta');
    const osVersion = system.osVersion || '';
    const osName    = system.osName    || '';
    const osDisplay = osVersion.startsWith(osName) ? osVersion : [osName, osVersion].filter(Boolean).join(' ');

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
