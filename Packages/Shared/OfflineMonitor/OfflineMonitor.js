import { createElement } from '../Utils/DomUtils.js';
import { dispatchEvent, EVENTS } from '../Events/RendererEvents.js';
import strings from '../I18n/en.js';

let currentStatus = navigator.onLine !== false;
let indicator = null;
let checkInterval = null;
let listeners = [];

function createIndicator() {
  const el = createElement('div', 'offline-indicator');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  const icon = createElement('span', 'offline-indicator__icon');
  const text = createElement('span', 'offline-indicator__text', strings.offlineMonitor.offline);
  el.append(icon, text);
  el.hidden = true;
  return el;
}

function updateIndicator() {
  if (!indicator) return;

  const isOnline = navigator.onLine !== false;
  const changed = isOnline !== currentStatus;
  currentStatus = isOnline;

  if (isOnline) {
    indicator.hidden = true;
    indicator.classList.remove('offline-indicator--offline');
    indicator.classList.add('offline-indicator--online');
  } else {
    indicator.hidden = false;
    indicator.classList.add('offline-indicator--offline');
    indicator.classList.remove('offline-indicator--online');
  }

  if (changed) {
    dispatchEvent(EVENTS.NETWORK_STATUS_CHANGED, { online: isOnline });
  }
}

function handleOnline() {
  updateIndicator();
  for (const fn of listeners) {
    try {
      fn(true);
    } catch {
      /* noop */
    }
  }
}

function handleOffline() {
  updateIndicator();
  for (const fn of listeners) {
    try {
      fn(false);
    } catch {
      /* noop */
    }
  }
}

export function initOfflineMonitor() {
  if (indicator) return indicator;

  indicator = createIndicator();
  document.body.append(indicator);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  updateIndicator();

  return indicator;
}

export function destroyOfflineMonitor() {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);

  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  indicator?.remove();
  indicator = null;
  currentStatus = navigator.onLine !== false;
  listeners = [];
}

export function isOnline() {
  return navigator.onLine !== false;
}

export function onNetworkChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((fn) => fn !== callback);
  };
}

export function getNetworkStatus() {
  return {
    online: navigator.onLine !== false,
    type: navigator.connection?.effectiveType ?? 'unknown',
    downlink: navigator.connection?.downlink ?? null,
    rtt: navigator.connection?.rtt ?? null,
  };
}
