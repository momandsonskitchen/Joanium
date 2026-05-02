export function createTagSelector({ options, selectedValues, onToggle }) {
  const selection = new Set(selectedValues);
  const list = document.createElement('div');
  list.className = 'joanium-tag-selector';

  for (const option of options) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'joanium-tag-selector__card';

    const label = document.createElement('span');
    label.className = 'joanium-tag-selector__label';
    label.textContent = option.label;

    const description = document.createElement('span');
    description.className = 'joanium-tag-selector__description';
    description.textContent = option.description;

    card.append(label, description);
    card.classList.toggle('is-selected', selection.has(option.id));

    card.addEventListener('click', () => {
      const nextIsSelected = !card.classList.contains('is-selected');
      card.classList.toggle('is-selected', nextIsSelected);

      if (typeof onToggle === 'function') {
        onToggle(option.id, nextIsSelected);
      }
    });

    list.append(card);
  }

  return list;
}
