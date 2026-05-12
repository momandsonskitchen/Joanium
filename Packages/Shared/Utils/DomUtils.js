export function formatText(template, replacements) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

export function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
