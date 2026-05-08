const DEFAULT_HEADERS = Object.freeze({
  accept: 'application/json',
  'user-agent': 'Joanium/2026 Toolset'
});

const WEATHER_CODES = new Map([
  [0, 'Clear sky'],
  [1, 'Mainly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Depositing rime fog'],
  [51, 'Light drizzle'],
  [53, 'Moderate drizzle'],
  [55, 'Dense drizzle'],
  [61, 'Slight rain'],
  [63, 'Moderate rain'],
  [65, 'Heavy rain'],
  [71, 'Slight snow'],
  [73, 'Moderate snow'],
  [75, 'Heavy snow'],
  [80, 'Slight rain showers'],
  [81, 'Moderate rain showers'],
  [82, 'Violent rain showers'],
  [95, 'Thunderstorm']
]);

function tool(name, description, category, parameters = {}) {
  return { name, description, category, parameters };
}

export const PUBLIC_DATA_TOOL_DEFINITIONS = [
  tool('search_web', 'Search public web sources using DuckDuckGo, Wikipedia, and Hacker News fallbacks.', 'search', {
    query: { type: 'string', required: true, description: 'Search query.' },
    limit: { type: 'number', required: false, description: 'Result count, default 5, max 10.' }
  }),
  tool('search_wikipedia', 'Get a Wikipedia summary for a topic.', 'wikipedia', {
    query: { type: 'string', required: true, description: 'Topic or article title.' }
  }),
  tool('get_wikipedia_search_results', 'Search Wikipedia and return matching article titles and snippets.', 'wikipedia', {
    query: { type: 'string', required: true, description: 'Search query.' },
    limit: { type: 'number', required: false, description: 'Result count, default 5, max 20.' }
  }),
  tool('get_wikipedia_full_article', 'Fetch plain-text Wikipedia article extract.', 'wikipedia', {
    title: { type: 'string', required: true, description: 'Article title.' },
    max_chars: { type: 'number', required: false, description: 'Maximum characters, default 6000.' }
  }),
  tool('get_wikipedia_sections', 'List section headings for a Wikipedia article.', 'wikipedia', {
    title: { type: 'string', required: true, description: 'Article title.' }
  }),
  tool('get_wikipedia_random_article', 'Fetch a random Wikipedia article summary.', 'wikipedia', {}),
  tool('get_wikipedia_on_this_day', 'Get Wikipedia on-this-day events for a month and day.', 'wikipedia', {
    month: { type: 'number', required: false, description: 'Month 1-12. Defaults to today.' },
    day: { type: 'number', required: false, description: 'Day of month. Defaults to today.' },
    type: { type: 'string', required: false, description: 'all, events, births, deaths, or holidays.' },
    limit: { type: 'number', required: false, description: 'Result count, default 5, max 20.' }
  }),
  tool('get_definition', 'Look up English dictionary definitions and examples.', 'reference', {
    word: { type: 'string', required: true, description: 'English word to define.' }
  }),
  tool('get_country_info', 'Look up country facts including capital, population, region, languages, and currencies.', 'reference', {
    country: { type: 'string', required: true, description: 'Country name or ISO country code.' }
  }),
  tool('get_quote', 'Fetch a short quote, optionally by tag.', 'fun', {
    tag: { type: 'string', required: false, description: 'Optional quote tag or topic.' }
  }),
  tool('get_joke', 'Fetch a safe joke from JokeAPI.', 'fun', {
    category: { type: 'string', required: false, description: 'Any, Programming, Misc, Pun, Spooky, or Christmas.' }
  }),
  tool('get_hacker_news', 'Fetch top, new, best, ask, show, or job stories from Hacker News.', 'news', {
    type: { type: 'string', required: false, description: 'top, new, best, ask, show, or job. Defaults to top.' },
    limit: { type: 'number', required: false, description: 'Result count, default 5, max 20.' }
  }),
  tool('search_photos', 'Search Wikimedia Commons for reusable images and return file links.', 'media', {
    query: { type: 'string', required: true, description: 'Image search query.' },
    limit: { type: 'number', required: false, description: 'Result count, default 5, max 12.' }
  }),
  tool('npm_search', 'Search the npm registry for packages.', 'npm', {
    query: { type: 'string', required: true, description: 'Package name or keywords.' },
    size: { type: 'number', required: false, description: 'Result count, default 5, max 10.' }
  }),
  tool('npm_package_info', 'Get npm package metadata for an exact package name.', 'npm', {
    name: { type: 'string', required: true, description: 'Exact npm package name.' }
  }),
  tool('npm_package_versions', 'List recent npm package versions and publish dates.', 'npm', {
    name: { type: 'string', required: true, description: 'Exact npm package name.' },
    limit: { type: 'number', required: false, description: 'Result count, default 15, max 30.' }
  }),
  tool('npm_package_downloads', 'Get npm package download counts for a period.', 'npm', {
    name: { type: 'string', required: true, description: 'Exact npm package name.' },
    period: { type: 'string', required: false, description: 'last-week, last-month, or last-year.' }
  }),
  tool('npm_compare_packages', 'Compare two npm packages by version, downloads, license, dependencies, and publish date.', 'npm', {
    package_a: { type: 'string', required: true, description: 'First package.' },
    package_b: { type: 'string', required: true, description: 'Second package.' }
  }),
  tool('stackoverflow_search', 'Search Stack Overflow questions by query.', 'stackoverflow', {
    query: { type: 'string', required: true, description: 'Question, error, or topic.' },
    count: { type: 'number', required: false, description: 'Result count, default 5, max 10.' }
  }),
  tool('stackoverflow_question_answers', 'Fetch top answers for a Stack Overflow question id.', 'stackoverflow', {
    question_id: { type: 'string', required: true, description: 'Question id.' },
    count: { type: 'number', required: false, description: 'Answer count, default 3, max 5.' }
  }),
  tool('stackoverflow_questions_by_tag', 'Fetch high-scoring Stack Overflow questions for a tag.', 'stackoverflow', {
    tag: { type: 'string', required: true, description: 'Stack Overflow tag.' },
    count: { type: 'number', required: false, description: 'Result count, default 5, max 10.' }
  }),
  tool('stackoverflow_hot', 'Fetch hot Stack Overflow questions, optionally by tag.', 'stackoverflow', {
    tag: { type: 'string', required: false, description: 'Optional tag.' },
    count: { type: 'number', required: false, description: 'Result count, default 5, max 10.' }
  }),
  tool('stackoverflow_similar', 'Find Stack Overflow questions similar to an error or title.', 'stackoverflow', {
    title: { type: 'string', required: true, description: 'Error text or question title.' },
    count: { type: 'number', required: false, description: 'Result count, default 5, max 10.' }
  }),
  tool('get_weather', 'Get current Open-Meteo weather for a city or place.', 'weather', {
    location: { type: 'string', required: true, description: 'City or place.' },
    units: { type: 'string', required: false, description: 'celsius or fahrenheit.' }
  }),
  tool('get_hourly_forecast', 'Get hourly Open-Meteo forecast for a city or place.', 'weather', {
    location: { type: 'string', required: true, description: 'City or place.' },
    units: { type: 'string', required: false, description: 'celsius or fahrenheit.' },
    hours: { type: 'number', required: false, description: 'Hours to show, default 24, max 48.' }
  }),
  tool('get_weekly_forecast', 'Get a 7-day Open-Meteo forecast for a city or place.', 'weather', {
    location: { type: 'string', required: true, description: 'City or place.' },
    units: { type: 'string', required: false, description: 'celsius or fahrenheit.' }
  }),
  tool('get_air_quality', 'Get current Open-Meteo air-quality readings for a city or place.', 'weather', {
    location: { type: 'string', required: true, description: 'City or place.' }
  }),
  tool('get_sunrise_sunset', 'Get sunrise, sunset, and daylight duration for the next week.', 'weather', {
    location: { type: 'string', required: true, description: 'City or place.' }
  }),
  tool('get_exchange_rate', 'Convert or list exchange rates using open.er-api.com.', 'finance', {
    from: { type: 'string', required: true, description: 'Source currency code.' },
    to: { type: 'string', required: false, description: 'Target currency code.' },
    amount: { type: 'number', required: false, description: 'Amount to convert, default 1.' }
  }),
  tool('get_crypto_price', 'Get crypto price, market cap, volume, and 24h change from CoinGecko.', 'crypto', {
    coin: { type: 'string', required: true, description: 'Coin name, symbol, or id.' },
    vs_currency: { type: 'string', required: false, description: 'Currency, default usd.' }
  }),
  tool('get_crypto_trending', 'Get trending coins from CoinGecko.', 'crypto', {
    limit: { type: 'number', required: false, description: 'Result count, default 7, max 15.' }
  }),
  tool('get_top_coins', 'List top crypto assets by market cap.', 'crypto', {
    vs_currency: { type: 'string', required: false, description: 'Currency, default usd.' },
    limit: { type: 'number', required: false, description: 'Result count, default 10, max 50.' }
  }),
  tool('search_crypto', 'Search CoinGecko for coins and tokens.', 'crypto', {
    query: { type: 'string', required: true, description: 'Coin search query.' },
    limit: { type: 'number', required: false, description: 'Result count, default 8, max 20.' }
  }),
  tool('get_apod', 'Fetch NASA Astronomy Picture of the Day. Uses DEMO_KEY unless api_key is provided.', 'astronomy', {
    date: { type: 'string', required: false, description: 'YYYY-MM-DD date.' },
    api_key: { type: 'string', required: false, description: 'Optional NASA API key.' }
  }),
  tool('get_iss_location', 'Get the current International Space Station position.', 'astronomy', {})
];

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function requireText(params, key) {
  const value = String(params?.[key] ?? '').trim();
  if (!value) throw new Error(`Missing required parameter: ${key}.`);
  return value;
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson(url, { headers = {}, ...options } = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...DEFAULT_HEADERS, ...headers }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data?.message || data?.error || text || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function formatList(title, rows) {
  return [title, '', ...rows.map((row, index) => `${index + 1}. ${row}`)].join('\n');
}

function toTitleUrl(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(String(title).replace(/ /g, '_'))}`;
}

async function wikipediaSummary(params) {
  const query = requireText(params, 'query');
  const encoded = encodeURIComponent(query);
  let data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}?redirect=true`).catch(() => null);

  if (!data?.title || data?.type === 'disambiguation') {
    const search = await fetchJson(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encoded}&limit=1&format=json&origin=*`
    );
    const title = search?.[1]?.[0];
    if (title) {
      data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`);
    }
  }

  if (!data?.title) throw new Error('No Wikipedia article found.');
  return [
    `Wikipedia: ${data.title}`,
    '',
    data.description ? `Description: ${data.description}` : null,
    data.extract,
    '',
    `URL: ${data.content_urls?.desktop?.page ?? toTitleUrl(data.title)}`
  ].filter(Boolean).join('\n');
}

async function wikipediaSearchResults(params) {
  const query = requireText(params, 'query');
  const limit = clampInteger(params.limit, 5, 1, 20);
  const data = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&srprop=snippet|titlesnippet&format=json&origin=*`
  );
  const rows = (data.query?.search ?? []).map((result) => [
    `${result.title}`,
    stripHtml(result.snippet),
    toTitleUrl(result.title)
  ].filter(Boolean).join('\n   '));
  return rows.length ? formatList(`Wikipedia search: ${query}`, rows) : `No Wikipedia results for "${query}".`;
}

async function wikipediaFullArticle(params) {
  const title = requireText(params, 'title');
  const maxChars = clampInteger(params.max_chars, 6000, 500, 20000);
  const data = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=true&exsectionformat=plain&format=json&origin=*`
  );
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page?.extract) throw new Error('No Wikipedia article extract found.');
  const extract = page.extract.length > maxChars ? `${page.extract.slice(0, maxChars)}...` : page.extract;
  return [`Wikipedia Article: ${page.title}`, '', extract, '', `URL: ${toTitleUrl(page.title)}`].join('\n');
}

async function wikipediaSections(params) {
  const title = requireText(params, 'title');
  const data = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=sections&format=json&origin=*`
  );
  const rows = (data.parse?.sections ?? []).map((section) => `${'  '.repeat(Math.max(0, Number(section.level) - 1))}${section.number} ${section.line}`);
  return rows.length ? [`Wikipedia sections: ${data.parse?.title ?? title}`, '', ...rows].join('\n') : 'No sections found.';
}

async function wikipediaRandomArticle() {
  const data = await fetchJson('https://en.wikipedia.org/api/rest_v1/page/random/summary');
  return [
    `Random Wikipedia Article: ${data.title}`,
    '',
    data.description ? `Description: ${data.description}` : null,
    data.extract,
    '',
    `URL: ${data.content_urls?.desktop?.page ?? toTitleUrl(data.title)}`
  ].filter(Boolean).join('\n');
}

async function wikipediaOnThisDay(params) {
  const now = new Date();
  const month = clampInteger(params.month, now.getMonth() + 1, 1, 12);
  const day = clampInteger(params.day, now.getDate(), 1, 31);
  const type = String(params.type ?? 'events').trim().toLowerCase();
  const safeType = ['all', 'events', 'births', 'deaths', 'holidays'].includes(type) ? type : 'events';
  const limit = clampInteger(params.limit, 5, 1, 20);
  const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/${safeType}/${month}/${day}`);
  const sections = safeType === 'all' ? ['events', 'births', 'deaths', 'holidays'] : [safeType];
  const rows = [];
  for (const section of sections) {
    for (const item of (data[section] ?? []).slice(0, limit)) {
      const page = item.pages?.[0];
      rows.push(`${item.year ? `${item.year}: ` : ''}${item.text}${page?.content_urls?.desktop?.page ? `\n   ${page.content_urls.desktop.page}` : ''}`);
    }
  }
  return rows.length ? formatList(`Wikipedia on this day: ${month}/${day}`, rows.slice(0, limit)) : 'No on-this-day items found.';
}

async function searchWeb(params) {
  const query = requireText(params, 'query');
  const limit = clampInteger(params.limit, 5, 1, 10);
  const rows = [];

  const duck = await fetchJson(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=0`
  ).catch(() => null);
  if (duck?.AbstractText) {
    rows.push(`${duck.Heading || query}\n   ${duck.AbstractText}\n   ${duck.AbstractURL || 'https://duckduckgo.com/'}`);
  }

  const wiki = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=3&srprop=snippet&origin=*`
  ).catch(() => null);
  for (const result of wiki?.query?.search ?? []) {
    rows.push(`${result.title}\n   ${stripHtml(result.snippet)}\n   ${toTitleUrl(result.title)}`);
  }

  const hn = await fetchJson(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=3`
  ).catch(() => null);
  for (const hit of hn?.hits ?? []) {
    rows.push(`${hit.title || hit.story_title}\n   Points: ${hit.points ?? 0}, comments: ${hit.num_comments ?? 0}\n   ${hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`}`);
  }

  return rows.length ? formatList(`Web search: ${query}`, rows.slice(0, limit)) : `No public search results found for "${query}".`;
}

async function getDefinition(params) {
  const word = requireText(params, 'word');
  const data = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  const entry = data?.[0];
  if (!entry) throw new Error('No definition found.');
  const lines = [`Definition: ${entry.word}`, ''];
  for (const meaning of entry.meanings ?? []) {
    lines.push(`${meaning.partOfSpeech}:`);
    for (const item of (meaning.definitions ?? []).slice(0, 3)) {
      lines.push(`- ${item.definition}${item.example ? ` Example: ${item.example}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

async function getCountryInfo(params) {
  const country = requireText(params, 'country');
  const endpoint = country.length <= 3
    ? `https://restcountries.com/v3.1/alpha/${encodeURIComponent(country)}`
    : `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=false`;
  const data = await fetchJson(endpoint);
  const item = Array.isArray(data) ? data[0] : data;
  if (!item) throw new Error('Country not found.');
  const currencies = Object.entries(item.currencies ?? {}).map(([code, value]) => `${code} (${value.name ?? 'currency'})`);
  return [
    `Country: ${item.name?.common ?? country}`,
    `Official name: ${item.name?.official ?? ''}`,
    `Capital: ${(item.capital ?? []).join(', ') || 'n/a'}`,
    `Region: ${[item.region, item.subregion].filter(Boolean).join(' / ') || 'n/a'}`,
    `Population: ${Number(item.population ?? 0).toLocaleString('en-US')}`,
    `Languages: ${Object.values(item.languages ?? {}).join(', ') || 'n/a'}`,
    `Currencies: ${currencies.join(', ') || 'n/a'}`,
    `Timezones: ${(item.timezones ?? []).join(', ') || 'n/a'}`,
    `Map: ${item.maps?.googleMaps ?? ''}`
  ].join('\n');
}

async function getQuote(params) {
  const tag = String(params.tag ?? '').trim();
  const zen = await fetchJson('https://zenquotes.io/api/random').catch(() => null);
  const item = Array.isArray(zen) ? zen[0] : null;
  if (item?.q) return [`Quote`, '', `"${item.q}"`, `- ${item.a ?? 'Unknown'}`].join('\n');

  const tagParam = tag ? `&tags=${encodeURIComponent(tag)}` : '';
  const data = await fetchJson(`https://api.quotable.io/quotes/random?limit=1${tagParam}`);
  const quote = Array.isArray(data) ? data[0] : data;
  return [`Quote`, '', `"${quote.content}"`, `- ${quote.author ?? 'Unknown'}`].join('\n');
}

async function getJoke(params) {
  const category = String(params.category ?? 'Any').trim() || 'Any';
  const safeCategory = ['Any', 'Programming', 'Misc', 'Pun', 'Spooky', 'Christmas'].includes(category) ? category : 'Any';
  const data = await fetchJson(`https://v2.jokeapi.dev/joke/${safeCategory}?blacklistFlags=nsfw,racist,sexist&type=single,twopart`);
  if (data.type === 'twopart') return [`Joke`, '', data.setup, data.delivery].join('\n');
  return [`Joke`, '', data.joke ?? 'No joke returned.'].join('\n');
}

async function getHackerNews(params) {
  const type = String(params.type ?? 'top').trim().toLowerCase();
  const endpoint = {
    top: 'topstories',
    new: 'newstories',
    best: 'beststories',
    ask: 'askstories',
    show: 'showstories',
    job: 'jobstories'
  }[type] ?? 'topstories';
  const limit = clampInteger(params.limit, 5, 1, 20);
  const ids = await fetchJson(`https://hacker-news.firebaseio.com/v0/${endpoint}.json`);
  const stories = await Promise.all(
    ids.slice(0, limit).map((id) => fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null))
  );
  const rows = stories.filter(Boolean).map((story) => (
    `${story.title}\n   Score: ${story.score ?? 0}, comments: ${story.descendants ?? 0}\n   ${story.url || `https://news.ycombinator.com/item?id=${story.id}`}`
  ));
  return rows.length ? formatList(`Hacker News: ${type}`, rows) : 'No Hacker News stories found.';
}

async function searchPhotos(params) {
  const query = requireText(params, 'query');
  const limit = clampInteger(params.limit, 5, 1, 12);
  const data = await fetchJson(
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|mime|size|user&format=json&origin=*`
  );
  const pages = Object.values(data.query?.pages ?? {});
  const rows = pages.map((page) => {
    const image = page.imageinfo?.[0] ?? {};
    return `${page.title.replace(/^File:/, '')}\n   ${image.url ?? ''}\n   Source: https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
  });
  return rows.length ? formatList(`Wikimedia Commons images: ${query}`, rows) : `No reusable images found for "${query}".`;
}

async function npmSearch(params) {
  const query = requireText(params, 'query');
  const size = clampInteger(params.size, 5, 1, 10);
  const data = await fetchJson(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`);
  const rows = (data.objects ?? []).map(({ package: pkg }) => (
    `${pkg.name}@${pkg.version}\n   ${pkg.description ?? 'No description'}\n   https://www.npmjs.com/package/${pkg.name}`
  ));
  return rows.length ? formatList(`npm search: ${query}`, rows) : `No npm packages found for "${query}".`;
}

async function npmPackage(name) {
  return fetchJson(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
}

function latestPackageVersion(pkg) {
  const latest = pkg['dist-tags']?.latest;
  return latest ? pkg.versions?.[latest] : null;
}

async function npmPackageInfo(params) {
  const name = requireText(params, 'name');
  const pkg = await npmPackage(name);
  const latest = latestPackageVersion(pkg);
  if (!latest) throw new Error('Package has no latest version.');
  return [
    `npm package: ${pkg.name}`,
    `Latest: ${latest.version}`,
    `Description: ${pkg.description ?? latest.description ?? 'n/a'}`,
    `License: ${latest.license ?? pkg.license ?? 'n/a'}`,
    `Dependencies: ${Object.keys(latest.dependencies ?? {}).length}`,
    `Homepage: ${pkg.homepage ?? latest.homepage ?? 'n/a'}`,
    `Repository: ${typeof latest.repository === 'string' ? latest.repository : latest.repository?.url ?? 'n/a'}`,
    `Published: ${pkg.time?.[latest.version] ?? 'n/a'}`,
    `URL: https://www.npmjs.com/package/${pkg.name}`
  ].join('\n');
}

async function npmPackageVersions(params) {
  const name = requireText(params, 'name');
  const limit = clampInteger(params.limit, 15, 1, 30);
  const pkg = await npmPackage(name);
  const rows = Object.keys(pkg.versions ?? {})
    .reverse()
    .slice(0, limit)
    .map((version) => `${version}${pkg.time?.[version] ? ` - ${pkg.time[version]}` : ''}`);
  return rows.length ? [`npm versions: ${pkg.name}`, '', ...rows].join('\n') : 'No versions found.';
}

async function npmPackageDownloads(params) {
  const name = requireText(params, 'name');
  const period = ['last-week', 'last-month', 'last-year'].includes(params.period) ? params.period : 'last-week';
  const data = await fetchJson(`https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(name)}`);
  return [`npm downloads: ${name}`, `Period: ${period}`, `Downloads: ${Number(data.downloads ?? 0).toLocaleString('en-US')}`].join('\n');
}

async function npmComparePackages(params) {
  const packageA = requireText(params, 'package_a');
  const packageB = requireText(params, 'package_b');
  const [infoA, infoB, downloadsA, downloadsB] = await Promise.all([
    npmPackage(packageA),
    npmPackage(packageB),
    fetchJson(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageA)}`).catch(() => null),
    fetchJson(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageB)}`).catch(() => null)
  ]);
  const latestA = latestPackageVersion(infoA);
  const latestB = latestPackageVersion(infoB);
  const row = (label, pkg, latest, downloads) => (
    `${label}: ${pkg.name}@${latest?.version ?? 'n/a'} | weekly downloads ${Number(downloads?.downloads ?? 0).toLocaleString('en-US')} | license ${latest?.license ?? 'n/a'} | deps ${Object.keys(latest?.dependencies ?? {}).length} | published ${pkg.time?.[latest?.version] ?? 'n/a'}`
  );
  return ['npm package comparison', '', row('A', infoA, latestA, downloadsA), row('B', infoB, latestB, downloadsB)].join('\n');
}

function stackExchangeUrl(path, params) {
  const url = new URL(`https://api.stackexchange.com/2.3/${path}`);
  url.searchParams.set('site', 'stackoverflow');
  for (const [key, value] of Object.entries(params)) {
    if (value != null && String(value).trim() !== '') url.searchParams.set(key, value);
  }
  return url.toString();
}

function formatStackQuestion(question) {
  return `${stripHtml(question.title)}\n   Score: ${question.score ?? 0}, answers: ${question.answer_count ?? 0}, views: ${question.view_count ?? 0}\n   ${question.link}`;
}

async function stackOverflowSearch(params) {
  const query = requireText(params, 'query');
  const count = clampInteger(params.count, 5, 1, 10);
  const data = await fetchJson(stackExchangeUrl('search/advanced', {
    order: 'desc',
    sort: 'relevance',
    q: query,
    pagesize: count
  }));
  const rows = (data.items ?? []).map(formatStackQuestion);
  return rows.length ? formatList(`Stack Overflow search: ${query}`, rows) : 'No Stack Overflow questions found.';
}

async function stackOverflowAnswers(params) {
  const questionId = requireText(params, 'question_id');
  const count = clampInteger(params.count, 3, 1, 5);
  const data = await fetchJson(stackExchangeUrl(`questions/${encodeURIComponent(questionId)}/answers`, {
    order: 'desc',
    sort: 'votes',
    pagesize: count,
    filter: 'withbody'
  }));
  const rows = (data.items ?? []).map((answer) => (
    `Score: ${answer.score ?? 0}${answer.is_accepted ? ' (accepted)' : ''}\n   ${stripHtml(answer.body).slice(0, 1200)}\n   https://stackoverflow.com/a/${answer.answer_id}`
  ));
  return rows.length ? formatList(`Stack Overflow answers: ${questionId}`, rows) : 'No answers found.';
}

async function stackOverflowQuestionsByTag(params) {
  const tag = requireText(params, 'tag');
  const count = clampInteger(params.count, 5, 1, 10);
  const data = await fetchJson(stackExchangeUrl('questions', {
    order: 'desc',
    sort: 'votes',
    tagged: tag,
    pagesize: count
  }));
  const rows = (data.items ?? []).map(formatStackQuestion);
  return rows.length ? formatList(`Top Stack Overflow questions: ${tag}`, rows) : 'No questions found.';
}

async function stackOverflowHot(params) {
  const count = clampInteger(params.count, 5, 1, 10);
  const data = await fetchJson(stackExchangeUrl('questions', {
    order: 'desc',
    sort: 'hot',
    tagged: String(params.tag ?? '').trim(),
    pagesize: count
  }));
  const rows = (data.items ?? []).map(formatStackQuestion);
  return rows.length ? formatList('Hot Stack Overflow questions', rows) : 'No hot questions found.';
}

async function stackOverflowSimilar(params) {
  const title = requireText(params, 'title');
  const count = clampInteger(params.count, 5, 1, 10);
  const data = await fetchJson(stackExchangeUrl('similar', {
    order: 'desc',
    sort: 'relevance',
    title,
    pagesize: count
  }));
  const rows = (data.items ?? []).map(formatStackQuestion);
  return rows.length ? formatList(`Similar Stack Overflow questions: ${title}`, rows) : 'No similar questions found.';
}

async function geocodeLocation(location) {
  const data = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
  );
  const result = data.results?.[0];
  if (!result) throw new Error(`Location not found: ${location}`);
  return result;
}

function temperatureUnit(units) {
  return String(units ?? '').toLowerCase().startsWith('f') ? 'fahrenheit' : 'celsius';
}

function weatherLabel(code) {
  return WEATHER_CODES.get(Number(code)) ?? `Weather code ${code}`;
}

async function getWeather(params) {
  const location = await geocodeLocation(requireText(params, 'location'));
  const units = temperatureUnit(params.units);
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,cloud_cover,surface_pressure&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&temperature_unit=${units}&wind_speed_unit=kmh&timezone=auto&forecast_days=3`
  );
  const current = data.current ?? {};
  const daily = data.daily ?? {};
  return [
    `Weather: ${location.name}, ${location.country}`,
    `Current: ${current.temperature_2m} ${data.current_units?.temperature_2m ?? ''}, feels like ${current.apparent_temperature} ${data.current_units?.apparent_temperature ?? ''}`,
    `Condition: ${weatherLabel(current.weather_code)}`,
    `Humidity: ${current.relative_humidity_2m}%`,
    `Wind: ${current.wind_speed_10m} km/h`,
    `Precipitation: ${current.precipitation ?? 0} mm`,
    '',
    'Next days:',
    ...(daily.time ?? []).map((date, index) => `${date}: ${daily.temperature_2m_min?.[index]}-${daily.temperature_2m_max?.[index]} ${data.daily_units?.temperature_2m_max ?? ''}, ${weatherLabel(daily.weather_code?.[index])}, rain ${daily.precipitation_sum?.[index] ?? 0} mm`)
  ].join('\n');
}

async function getHourlyForecast(params) {
  const location = await geocodeLocation(requireText(params, 'location'));
  const units = temperatureUnit(params.units);
  const hours = clampInteger(params.hours, 24, 1, 48);
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,relative_humidity_2m&temperature_unit=${units}&wind_speed_unit=kmh&timezone=auto&forecast_days=2`
  );
  const hourly = data.hourly ?? {};
  const rows = (hourly.time ?? []).slice(0, hours).map((time, index) => (
    `${time}: ${hourly.temperature_2m?.[index]} ${data.hourly_units?.temperature_2m ?? ''}, ${weatherLabel(hourly.weather_code?.[index])}, rain chance ${hourly.precipitation_probability?.[index] ?? 0}%, wind ${hourly.wind_speed_10m?.[index] ?? 0} km/h`
  ));
  return [`Hourly forecast: ${location.name}, ${location.country}`, '', ...rows].join('\n');
}

async function getWeeklyForecast(params) {
  const location = await geocodeLocation(requireText(params, 'location'));
  const units = temperatureUnit(params.units);
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,uv_index_max,precipitation_probability_max,wind_speed_10m_max&temperature_unit=${units}&wind_speed_unit=kmh&timezone=auto&forecast_days=7`
  );
  const daily = data.daily ?? {};
  const rows = (daily.time ?? []).map((date, index) => (
    `${date}: ${daily.temperature_2m_min?.[index]}-${daily.temperature_2m_max?.[index]} ${data.daily_units?.temperature_2m_max ?? ''}, ${weatherLabel(daily.weather_code?.[index])}, rain ${daily.precipitation_sum?.[index] ?? 0} mm, UV ${daily.uv_index_max?.[index] ?? 'n/a'}`
  ));
  return [`Weekly forecast: ${location.name}, ${location.country}`, '', ...rows].join('\n');
}

async function getAirQuality(params) {
  const location = await geocodeLocation(requireText(params, 'location'));
  const data = await fetchJson(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi`
  );
  const current = data.current ?? {};
  return [
    `Air quality: ${location.name}, ${location.country}`,
    `European AQI: ${current.european_aqi ?? 'n/a'}`,
    `PM2.5: ${current.pm2_5 ?? 'n/a'} ug/m3`,
    `PM10: ${current.pm10 ?? 'n/a'} ug/m3`,
    `Ozone: ${current.ozone ?? 'n/a'} ug/m3`,
    `NO2: ${current.nitrogen_dioxide ?? 'n/a'} ug/m3`,
    `CO: ${current.carbon_monoxide ?? 'n/a'} ug/m3`
  ].join('\n');
}

async function getSunriseSunset(params) {
  const location = await geocodeLocation(requireText(params, 'location'));
  const data = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=sunrise,sunset,daylight_duration,sunshine_duration&timezone=auto&forecast_days=7`
  );
  const daily = data.daily ?? {};
  const rows = (daily.time ?? []).map((date, index) => (
    `${date}: sunrise ${daily.sunrise?.[index] ?? 'n/a'}, sunset ${daily.sunset?.[index] ?? 'n/a'}, daylight ${Math.round((daily.daylight_duration?.[index] ?? 0) / 60)} min`
  ));
  return [`Sunrise and sunset: ${location.name}, ${location.country}`, '', ...rows].join('\n');
}

async function getExchangeRate(params) {
  const from = requireText(params, 'from').toUpperCase();
  const to = String(params.to ?? '').trim().toUpperCase();
  const amount = Number(params.amount ?? 1);
  if (!Number.isFinite(amount)) throw new Error('amount must be a number.');
  const data = await fetchJson(`https://open.er-api.com/v6/latest/${from}`);
  if (data.result !== 'success') throw new Error(data['error-type'] ?? 'Exchange rate lookup failed.');
  if (to) {
    const rate = data.rates?.[to];
    if (!Number.isFinite(rate)) throw new Error(`No exchange rate for ${to}.`);
    return [`Exchange rate`, `${amount} ${from} = ${(amount * rate).toFixed(4)} ${to}`, `Rate: ${rate}`, `Updated: ${data.time_last_update_utc}`].join('\n');
  }
  const rows = Object.entries(data.rates ?? {}).slice(0, 25).map(([code, rate]) => `${code}: ${rate}`);
  return [`Exchange rates from ${from}`, `Updated: ${data.time_last_update_utc}`, '', ...rows].join('\n');
}

async function findCoinId(query) {
  const data = await fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
  const coin = data.coins?.[0];
  if (!coin?.id) throw new Error(`No CoinGecko coin found for "${query}".`);
  return coin;
}

async function getCryptoPrice(params) {
  const coin = await findCoinId(requireText(params, 'coin'));
  const vs = String(params.vs_currency ?? 'usd').trim().toLowerCase() || 'usd';
  const data = await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=${vs}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`
  );
  const price = data[coin.id] ?? {};
  return [
    `Crypto price: ${coin.name} (${coin.symbol?.toUpperCase()})`,
    `Price: ${price[vs] ?? 'n/a'} ${vs.toUpperCase()}`,
    `24h change: ${price[`${vs}_24h_change`]?.toFixed?.(2) ?? 'n/a'}%`,
    `Market cap: ${Number(price[`${vs}_market_cap`] ?? 0).toLocaleString('en-US')} ${vs.toUpperCase()}`,
    `24h volume: ${Number(price[`${vs}_24h_vol`] ?? 0).toLocaleString('en-US')} ${vs.toUpperCase()}`
  ].join('\n');
}

async function getCryptoTrending(params) {
  const limit = clampInteger(params.limit, 7, 1, 15);
  const data = await fetchJson('https://api.coingecko.com/api/v3/search/trending');
  const rows = (data.coins ?? []).slice(0, limit).map(({ item }) => `${item.name} (${item.symbol}) - rank ${item.market_cap_rank ?? 'n/a'} - https://www.coingecko.com/en/coins/${item.id}`);
  return rows.length ? formatList('Trending crypto assets', rows) : 'No trending coins found.';
}

async function getTopCoins(params) {
  const vs = String(params.vs_currency ?? 'usd').trim().toLowerCase() || 'usd';
  const limit = clampInteger(params.limit, 10, 1, 50);
  const data = await fetchJson(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
  );
  const rows = data.map((coin) => `${coin.market_cap_rank}. ${coin.name} (${coin.symbol.toUpperCase()}): ${coin.current_price} ${vs.toUpperCase()}, 24h ${coin.price_change_percentage_24h?.toFixed?.(2) ?? 'n/a'}%`);
  return formatList(`Top crypto assets by market cap (${vs.toUpperCase()})`, rows);
}

async function searchCrypto(params) {
  const query = requireText(params, 'query');
  const limit = clampInteger(params.limit, 8, 1, 20);
  const data = await fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
  const rows = (data.coins ?? []).slice(0, limit).map((coin) => `${coin.name} (${coin.symbol}) - id ${coin.id} - rank ${coin.market_cap_rank ?? 'n/a'}`);
  return rows.length ? formatList(`CoinGecko search: ${query}`, rows) : 'No crypto assets found.';
}

async function getApod(params) {
  const apiKey = String(params.api_key ?? 'DEMO_KEY').trim() || 'DEMO_KEY';
  const date = String(params.date ?? '').trim();
  const url = new URL('https://api.nasa.gov/planetary/apod');
  url.searchParams.set('api_key', apiKey);
  if (date) url.searchParams.set('date', date);
  const data = await fetchJson(url.toString());
  return [
    `NASA APOD: ${data.title}`,
    `Date: ${data.date}`,
    `Media type: ${data.media_type}`,
    `URL: ${data.hdurl ?? data.url ?? 'n/a'}`,
    '',
    data.explanation
  ].join('\n');
}

async function getIssLocation() {
  const data = await fetchJson('http://api.open-notify.org/iss-now.json');
  const pos = data.iss_position ?? {};
  return [
    'International Space Station position',
    `Latitude: ${pos.latitude}`,
    `Longitude: ${pos.longitude}`,
    `Timestamp: ${data.timestamp ? new Date(data.timestamp * 1000).toISOString() : 'n/a'}`,
    'Map: https://spotthestation.nasa.gov/tracking_map.cfm'
  ].join('\n');
}

export function createPublicDataToolHandlers() {
  return {
    search_web: searchWeb,
    search_wikipedia: wikipediaSummary,
    get_wikipedia_search_results: wikipediaSearchResults,
    get_wikipedia_full_article: wikipediaFullArticle,
    get_wikipedia_sections: wikipediaSections,
    get_wikipedia_random_article: wikipediaRandomArticle,
    get_wikipedia_on_this_day: wikipediaOnThisDay,
    get_definition: getDefinition,
    get_country_info: getCountryInfo,
    get_quote: getQuote,
    get_joke: getJoke,
    get_hacker_news: getHackerNews,
    search_photos: searchPhotos,
    npm_search: npmSearch,
    npm_package_info: npmPackageInfo,
    npm_package_versions: npmPackageVersions,
    npm_package_downloads: npmPackageDownloads,
    npm_compare_packages: npmComparePackages,
    stackoverflow_search: stackOverflowSearch,
    stackoverflow_question_answers: stackOverflowAnswers,
    stackoverflow_questions_by_tag: stackOverflowQuestionsByTag,
    stackoverflow_hot: stackOverflowHot,
    stackoverflow_similar: stackOverflowSimilar,
    get_weather: getWeather,
    get_hourly_forecast: getHourlyForecast,
    get_weekly_forecast: getWeeklyForecast,
    get_air_quality: getAirQuality,
    get_sunrise_sunset: getSunriseSunset,
    get_exchange_rate: getExchangeRate,
    get_crypto_price: getCryptoPrice,
    get_crypto_trending: getCryptoTrending,
    get_top_coins: getTopCoins,
    search_crypto: searchCrypto,
    get_apod: getApod,
    get_iss_location: getIssLocation
  };
}
