const fetch = require('node-fetch');
const { extractText } = require('./crawler');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchReddit(companyName) {
  try {
    const query = encodeURIComponent(`${companyName} interview process`);
    const url = `https://www.reddit.com/search.json?q=${query}&sort=relevance&limit=5&t=year`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'InterviewPrepBot/1.0' },
      timeout: 8000,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const posts = data?.data?.children || [];
    return posts.map(p => ({
      title: p.data.title,
      text: (p.data.selftext || '').slice(0, 1000),
      url: `https://reddit.com${p.data.permalink}`,
    }));
  } catch {
    return [];
  }
}

async function searchHackerNews(companyName) {
  try {
    const query = encodeURIComponent(`${companyName} interview`);
    const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=5`;
    const res = await fetch(url, { timeout: 8000 });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map(h => ({
      title: h.title,
      text: (h.story_text || '').slice(0, 1000),
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    }));
  } catch {
    return [];
  }
}

async function researchPublicDiscussion(companyName, emit) {
  emit?.(`Searching public discussion about ${companyName} interviews...`);

  const [redditPosts, hnPosts] = await Promise.all([
    searchReddit(companyName),
    searchHackerNews(companyName),
  ]);

  const all = [...redditPosts, ...hnPosts];
  if (all.length === 0) {
    emit?.('No public discussion found — continuing without it');
    return { found: false, summary: '' };
  }

  emit?.(`Found ${all.length} public discussion threads`);
  const summary = all
    .map(p => `Source: ${p.url}\nTitle: ${p.title}\n${p.text}`)
    .join('\n\n---\n\n')
    .slice(0, 6000);

  return { found: true, summary };
}

module.exports = { researchPublicDiscussion };
