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

export function copyToClipboard(text) {
  const value = String(text ?? '');

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(value).catch(() => copyWithExecCommand(value));
  }

  copyWithExecCommand(value);
  return Promise.resolve();
}

function copyWithExecCommand(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
  } catch {
    // No further browser clipboard fallback is available.
  } finally {
    textarea.remove();
  }
}
