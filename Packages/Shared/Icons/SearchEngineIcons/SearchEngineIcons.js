import { getIconPath } from '../Utils.js';

const SEARCH_ENGINE_ICON_FILES = Object.freeze({
  google: 'Google',
  bing: 'Bing',
  duckduckgo: 'DuckDuckGo',
  yandex: 'Yandex',
  yahoo: 'Yahoo',
  brave: 'Brave',
  ecosia: 'Ecosia',
  kagi: 'Kagi',
  perplexity: 'Perplexity',
  startpage: 'Startpage',
  baidu: 'Baidu',
  naver: 'Naver',
  qwant: 'Qwant',
  swisscows: 'Swisscows',
  wolframalpha: 'WolframAlpha',
  ask: 'Ask',
  aol: 'AOL',
  dogpile: 'DogPile',
  mojeek: 'Mojeek',
  you: 'You',
});

export function getSearchEngineIconPath(engineId) {
  return getIconPath(engineId, SEARCH_ENGINE_ICON_FILES);
}
