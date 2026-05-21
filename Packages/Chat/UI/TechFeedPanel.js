import { createElement } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const HN_TOP_STORIES = `${HN_API}/topstories.json`;
const HN_ITEM = (id) => `${HN_API}/item/${id}.json`;
const GITHUB_TRENDING_API =
  'https://api.github.com/search/repositories?q=created:>DATE&sort=stars&order=desc&per_page=5';
const DEVTO_API = 'https://dev.to/api/articles?top=7&per_page=5';
const REDDIT_API = 'https://www.reddit.com/r/programming/top.json?limit=5';
const LOBSTERS_API = 'https://lobste.rs/hottest.json';

const SHIMMER_COUNT = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// All HTTP requests are proxied through the main process (chat:fetch-url) so
// they are never subject to renderer CSP or Firebase origin restrictions in
// packaged builds.
async function fetchJson(url) {
  return invokeIpc('chat:fetch-url', url);
}

function truncateText(str, max) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max).trimEnd()}...` : str;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchHackerNews() {
  const ids = await fetchJson(HN_TOP_STORIES);
  const top = ids.slice(0, 12);
  const items = await Promise.all(top.map((id) => fetchJson(HN_ITEM(id)).catch(() => null)));
  return items
    .filter((item) => item && item.url && item.title)
    .slice(0, 5)
    .map((item) => ({
      source: 'Hacker News',
      title: item.title,
      description: item.url ? new URL(item.url).hostname.replace('www.', '') : '',
      url: item.url,
      image: null,
      meta: `${item.score ?? 0} points · ${item.descendants ?? 0} comments`,
    }));
}

async function fetchGithubTrending() {
  const url = GITHUB_TRENDING_API.replace('DATE', todayMinus(7));
  const data = await fetchJson(url);
  return (data.items ?? []).slice(0, 5).map((repo) => ({
    source: 'GitHub',
    title: repo.full_name,
    description: truncateText(repo.description, 120),
    url: repo.html_url,
    image: repo.owner?.avatar_url ?? null,
    meta: `⭐ ${(repo.stargazers_count ?? 0).toLocaleString()} stars`,
  }));
}

async function fetchDevTo() {
  const articles = await fetchJson(DEVTO_API);
  return (articles ?? []).slice(0, 5).map((a) => ({
    source: 'DEV Community',
    title: a.title,
    description: truncateText(a.description, 120),
    url: a.url,
    image: a.social_image ?? a.cover_image ?? null,
    meta: `👍 ${a.positive_reactions_count ?? 0} · ⏳ ${a.reading_time_minutes ?? 1} min read`,
  }));
}

async function fetchReddit() {
  const data = await fetchJson(REDDIT_API);
  const posts = data?.data?.children ?? [];
  return posts.slice(0, 5).map((p) => {
    const post = p.data;
    return {
      source: 'Reddit',
      title: post.title,
      description: truncateText(post.selftext || `Posted by u/${post.author}`, 120),
      url: `https://reddit.com${post.permalink}`,
      image: post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : null,
      meta: `⬆️ ${post.ups ?? 0} upvotes · ${post.num_comments ?? 0} comments`,
    };
  });
}

async function fetchLobsters() {
  const stories = await fetchJson(LOBSTERS_API);
  return (stories ?? []).slice(0, 5).map((s) => {
    const username =
      typeof s.submitter_user === 'string'
        ? s.submitter_user
        : s.submitter_user?.username || 'someone';
    const avatar =
      typeof s.submitter_user === 'object' && s.submitter_user?.avatar_url
        ? `https://lobste.rs${s.submitter_user.avatar_url}`
        : null;

    return {
      source: 'Lobste.rs',
      title: s.title,
      description: truncateText(s.description || `Posted by ${username}`, 120),
      url: s.url || s.short_id_url,
      image: avatar,
      meta: `${s.score ?? 0} points · ${s.comment_count ?? 0} comments`,
    };
  });
}

// ── Renderers ─────────────────────────────────────────────────────────────────

function openInBrowser(url) {
  void invokeIpc('browser-preview:load-url', url).catch(() => {});
}

function createShimmerCard() {
  const card = createElement('div', 'tech-feed__card tech-feed__card--shimmer');
  const imgBox = createElement('div', 'tech-feed__card-img-wrap tech-feed__card-img-wrap--shimmer');
  const body = createElement('div', 'tech-feed__card-body');
  body.append(
    createElement('div', 'tech-feed__shimmer-line tech-feed__shimmer-line--title'),
    createElement('div', 'tech-feed__shimmer-line'),
    createElement('div', 'tech-feed__shimmer-line tech-feed__shimmer-line--short'),
  );
  card.append(imgBox, body);
  return card;
}

function createSourceIcon(source) {
  const wrap = createElement('span', 'tech-feed__source-icon');
  wrap.textContent = source.slice(0, 2).toUpperCase();
  return wrap;
}

function buildCard(item) {
  const card = createElement('button', 'tech-feed__card');
  card.type = 'button';

  const imgWrap = createElement('div', 'tech-feed__card-img-wrap');
  if (item.image) {
    const img = document.createElement('img');
    img.className = 'tech-feed__card-img';
    img.src = item.image;
    img.alt = '';
    img.draggable = false;
    img.loading = 'lazy';
    img.onerror = () => {
      imgWrap.classList.add('tech-feed__card-img-wrap--fallback');
      img.remove();
      imgWrap.append(createSourceIcon(item.source));
    };
    imgWrap.append(img);
  } else {
    imgWrap.classList.add('tech-feed__card-img-wrap--fallback');
    imgWrap.append(createSourceIcon(item.source));
  }

  const body = createElement('div', 'tech-feed__card-body');
  body.append(
    createElement('span', 'tech-feed__card-source', item.source),
    createElement('h3', 'tech-feed__card-title', item.title),
  );
  if (item.description) {
    body.append(createElement('p', 'tech-feed__card-desc', item.description));
  }
  if (item.meta) {
    body.append(createElement('p', 'tech-feed__card-meta', item.meta));
  }

  card.append(imgWrap, body);
  card.addEventListener('click', () => openInBrowser(item.url));
  return card;
}

// ── Public factory ─────────────────────────────────────────────────────────────

export function createTechFeedPanel(strings) {
  const el = createElement('div', 'tech-feed');
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', strings.label ?? 'Tech feed');

  let abortController = null;

  function showShimmers() {
    const row = createElement('div', 'tech-feed__row');
    for (let i = 0; i < SHIMMER_COUNT; i++) {
      row.append(createShimmerCard());
    }
    el.replaceChildren(row);
  }

  async function load() {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    showShimmers();

    const [hn, gh, dev, reddit, lobsters] = await Promise.allSettled([
      fetchHackerNews(),
      fetchGithubTrending(),
      fetchDevTo(),
      fetchReddit(),
      fetchLobsters(),
    ]);

    if (abortController.signal.aborted) return;

    let items = [
      ...(hn.status === 'fulfilled' ? hn.value : []),
      ...(gh.status === 'fulfilled' ? gh.value : []),
      ...(dev.status === 'fulfilled' ? dev.value : []),
      ...(reddit.status === 'fulfilled' ? reddit.value : []),
      ...(lobsters.status === 'fulfilled' ? lobsters.value : []),
    ];

    items = shuffleArray(items);

    el.replaceChildren();

    if (items.length === 0) {
      el.append(createElement('p', 'tech-feed__empty', strings.empty ?? 'No news available.'));
      return;
    }

    const row = createElement('div', 'tech-feed__row');
    for (const item of items) {
      row.append(buildCard(item));
    }
    el.append(row);
  }

  function destroy() {
    if (abortController) abortController.abort();
  }

  showShimmers();
  load().catch(() => {});

  return { element: el, load, destroy };
}
