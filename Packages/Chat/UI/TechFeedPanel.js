import { createElement, formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc } from '../../Shared/Ipc/RendererIpc.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const HN_TOP_STORIES = `${HN_API}/topstories.json`;
const HN_ITEM = (id) => `${HN_API}/item/${id}.json`;

const GITHUB_TRENDING = (date, count) =>
  `https://api.github.com/search/repositories?q=created:>${date}&sort=stars&order=desc&per_page=${count}`;

const DEVTO_API = 'https://dev.to/api/articles?top=7&per_page=12';
const REDDIT_API = (subreddit, limit) =>
  `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/top.json?limit=${limit}&t=day`;
const LOBSTERS_API = 'https://lobste.rs/hottest.json';
const STACKOVERFLOW_API =
  'https://api.stackexchange.com/2.3/questions?order=desc&sort=hot&site=stackoverflow&pagesize=10&filter=default';

const SHIMMER_COUNT = 5;

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d.toISOString().slice(0, 10);
}

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

function formatCount(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toLocaleString() : '0';
}

function formatMeta(strings, key, replacements) {
  const template = strings.meta?.[key];
  return formatTemplate(template, replacements);
}

function formatTemplate(template, replacements) {
  return template ? formatText(template, replacements) : '';
}

function joinMeta(strings, parts) {
  return parts.filter(Boolean).join(strings.meta?.separator ?? ' ');
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function fetchHackerNews(strings) {
  const ids = await fetchJson(HN_TOP_STORIES);
  const top = Array.isArray(ids) ? ids.slice(0, 30) : [];
  const items = await Promise.all(top.map((id) => fetchJson(HN_ITEM(id)).catch(() => null)));

  return items
    .filter((item) => item && item.url && item.title)
    .slice(0, 20)
    .map((item) => ({
      source: strings.hn,
      title: item.title,
      description: safeHostname(item.url),
      url: item.url,
      image: '../../../Assets/Icons/HackerNews.png',
      meta: joinMeta(strings, [
        formatMeta(strings, 'points', { count: formatCount(item.score) }),
        formatMeta(strings, 'comments', { count: formatCount(item.descendants) }),
      ]),
    }));
}

async function fetchGithubTrending(strings, { days, count, label }) {
  const url = GITHUB_TRENDING(todayMinus(days), count);
  const data = await fetchJson(url);

  return (data?.items ?? []).slice(0, count).map((repo) => ({
    source: label,
    title: repo.full_name,
    description: truncateText(repo.description, 120),
    url: repo.html_url,
    image: repo.owner?.avatar_url ?? null,
    meta: joinMeta(strings, [
      formatMeta(strings, 'stars', { count: formatCount(repo.stargazers_count) }),
      repo.language ?? strings.codeFallback,
    ]),
  }));
}

async function fetchDevTo(strings) {
  const articles = await fetchJson(DEVTO_API);

  return (articles ?? []).slice(0, 12).map((article) => ({
    source: strings.dev,
    title: article.title,
    description: truncateText(article.description, 120),
    url: article.url,
    image: article.social_image ?? article.cover_image ?? null,
    meta: joinMeta(strings, [
      formatMeta(strings, 'reactions', { count: formatCount(article.positive_reactions_count) }),
      formatMeta(strings, 'readTime', { count: formatCount(article.reading_time_minutes ?? 1) }),
    ]),
  }));
}

async function fetchReddit(strings, { subreddit, limit, label }) {
  const data = await fetchJson(REDDIT_API(subreddit, limit));
  const posts = data?.data?.children ?? [];

  return posts.slice(0, limit).map((entry) => {
    const post = entry.data;
    const author = post.author || strings.authorFallback;
    return {
      source: label,
      title: post.title,
      description: truncateText(
        post.selftext || formatTemplate(strings.postedBy, { name: author }),
        120,
      ),
      url: `https://reddit.com${post.permalink}`,
      image: post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : null,
      meta: joinMeta(strings, [
        formatMeta(strings, 'votes', { count: formatCount(post.ups) }),
        formatMeta(strings, 'comments', { count: formatCount(post.num_comments) }),
      ]),
    };
  });
}

async function fetchLobsters(strings) {
  const stories = await fetchJson(LOBSTERS_API);

  return (stories ?? []).slice(0, 12).map((story) => {
    const username =
      typeof story.submitter_user === 'string'
        ? story.submitter_user
        : story.submitter_user?.username || strings.authorFallback;
    const avatar =
      typeof story.submitter_user === 'object' && story.submitter_user?.avatar_url
        ? `https://lobste.rs${story.submitter_user.avatar_url}`
        : null;

    return {
      source: strings.lobsters,
      title: story.title,
      description: truncateText(
        story.description || formatTemplate(strings.postedBy, { name: username }),
        120,
      ),
      url: story.url || story.short_id_url,
      image: avatar,
      meta: joinMeta(strings, [
        formatMeta(strings, 'points', { count: formatCount(story.score) }),
        formatMeta(strings, 'comments', { count: formatCount(story.comment_count) }),
      ]),
    };
  });
}

async function fetchStackOverflow(strings) {
  const data = await fetchJson(STACKOVERFLOW_API);

  return (data?.items ?? []).slice(0, 10).map((question) => ({
    source: strings.stackOverflow,
    title: question.title,
    description: truncateText(
      question.tags
        ? question.tags.slice(0, 5).join(strings.meta?.separator ?? ' ')
        : formatTemplate(strings.postedBy, {
            name: question.owner?.display_name ?? strings.authorFallback,
          }),
      120,
    ),
    url: question.link,
    image: question.owner?.profile_image ?? null,
    meta: joinMeta(strings, [
      formatMeta(strings, 'votes', { count: formatCount(question.score) }),
      formatMeta(strings, 'answers', { count: formatCount(question.answer_count) }),
      formatMeta(strings, 'views', { count: formatCount(question.view_count) }),
    ]),
  }));
}

function openInBrowser(url) {
  if (!url) return;
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

function createSourceIcon(source = '') {
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

export function createTechFeedPanel(strings = {}) {
  const el = createElement('div', 'tech-feed');
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', strings.label ?? '');

  let abortController = null;

  // Redirect vertical-wheel delta to horizontal scroll. Attached directly
  // to each row so it fires at the source before the event reaches the
  // parent scroll container. stopPropagation prevents the chat-stage__scroll
  // (overflow-x: hidden) from eating the event; preventDefault stops the
  // browser's default vertical scroll.
  function attachRowWheel(row) {
    row.addEventListener(
      'wheel',
      (event) => {
        if (event.deltaY === 0) return;
        const canLeft = row.scrollLeft > 0;
        const canRight = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
        if ((event.deltaY < 0 && !canLeft) || (event.deltaY > 0 && !canRight)) return;
        event.preventDefault();
        event.stopPropagation();
        row.scrollBy({ left: event.deltaY, behavior: 'instant' });
      },
      { passive: false },
    );
  }

  function showShimmers() {
    const row = createElement('div', 'tech-feed__row');
    attachRowWheel(row);
    for (let i = 0; i < SHIMMER_COUNT; i++) {
      row.append(createShimmerCard());
    }
    el.replaceChildren(row);
  }

  async function load() {
    abortController?.abort();
    const requestController = new AbortController();
    abortController = requestController;

    showShimmers();

    const [hn, gh, dev, redditProgramming, redditMachineLearning, lobsters, stackOverflow] =
      await Promise.allSettled([
        fetchHackerNews(strings),
        fetchGithubTrending(strings, { days: 14, count: 12, label: strings.github }),
        fetchDevTo(strings),
        fetchReddit(strings, {
          subreddit: 'programming',
          limit: 10,
          label: strings.redditProgramming,
        }),
        fetchReddit(strings, {
          subreddit: 'MachineLearning',
          limit: 8,
          label: strings.redditMachineLearning,
        }),
        fetchLobsters(strings),
        fetchStackOverflow(strings),
      ]);

    if (requestController.signal.aborted || abortController !== requestController) {
      return;
    }

    let items = [
      ...(hn.status === 'fulfilled' ? hn.value : []),
      ...(gh.status === 'fulfilled' ? gh.value : []),
      ...(dev.status === 'fulfilled' ? dev.value : []),
      ...(redditProgramming.status === 'fulfilled' ? redditProgramming.value : []),
      ...(redditMachineLearning.status === 'fulfilled' ? redditMachineLearning.value : []),
      ...(lobsters.status === 'fulfilled' ? lobsters.value : []),
      ...(stackOverflow.status === 'fulfilled' ? stackOverflow.value : []),
    ];

    items = shuffleArray(items);
    el.replaceChildren();

    if (items.length === 0) {
      el.append(createElement('p', 'tech-feed__empty', strings.empty ?? ''));
      return;
    }

    const row = createElement('div', 'tech-feed__row');
    attachRowWheel(row);
    for (const item of items) {
      row.append(buildCard(item));
    }
    el.append(row);
  }

  function destroy() {
    abortController?.abort();
    abortController = null;
  }

  showShimmers();
  load().catch(() => {});

  return { element: el, load, destroy };
}
