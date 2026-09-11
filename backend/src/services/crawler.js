const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { validateExternalUrl } = require('../utils/urlValidator');

const FETCH_TIMEOUT = 10000;
const MAX_PAGES = 20;
const MAX_CONTENT_SIZE = 500000; // 500KB

const HIRING_KEYWORDS = [
  'career', 'careers', 'job', 'jobs', 'hiring', 'work with us', 'join us',
  'join our team', 'open role', 'open position', 'vacancy', 'vacancies',
  'we are hiring', 'engineering blog', 'culture', 'handbook', 'about us',
  'team', 'people', 'life at',
];

const HIRING_PATH_PATTERNS = [
  /\/career/i, /\/job/i, /\/hiring/i, /\/work/i, /\/join/i,
  /\/about/i, /\/team/i, /\/culture/i, /\/people/i, /\/handbook/i,
  /\/blog\/engineering/i, /\/engineering/i,
];

async function fetchPage(url, timeout = FETCH_TIMEOUT) {
  const validation = validateExternalUrl(url);
  if (!validation.valid) throw new Error(`URL rejected: ${validation.reason}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InterviewPrepBot/1.0)' },
      redirect: 'follow',
    });

    clearTimeout(timer);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { url, success: false, reason: 'Non-HTML content type' };
    }

    const buffer = await res.buffer();
    if (buffer.length > MAX_CONTENT_SIZE) {
      return { url, success: true, html: buffer.slice(0, MAX_CONTENT_SIZE).toString() };
    }

    return { url, success: true, html: buffer.toString(), status: res.status };
  } catch (err) {
    clearTimeout(timer);
    return { url, success: false, reason: err.message };
  }
}

function extractLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
    try {
      const resolved = new URL(href, base);
      if (resolved.hostname === base.hostname) {
        links.add(resolved.href.split('#')[0]);
      }
    } catch {}
  });

  return [...links];
}

function scoreLink(url, linkText) {
  let score = 0;
  const combined = (url + ' ' + (linkText || '')).toLowerCase();
  for (const kw of HIRING_KEYWORDS) {
    if (combined.includes(kw)) score += 2;
  }
  for (const pattern of HIRING_PATH_PATTERNS) {
    if (pattern.test(url)) score += 3;
  }
  return score;
}

function extractText(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
}

async function checkRobotsTxt(baseUrl) {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const res = await fetch(robotsUrl, { timeout: 5000 });
    if (res.ok) return await res.text();
  } catch {}
  return '';
}

async function crawlCompanySite(companyUrl, emit) {
  const result = {
    companyInfo: '',
    hiringInfo: '',
    pagesUsed: [],
    hiringPageFound: false,
  };

  const validation = validateExternalUrl(companyUrl);
  if (!validation.valid) {
    return { ...result, error: validation.reason };
  }

  emit?.('Fetching company homepage...');
  const home = await fetchPage(companyUrl);
  if (!home.success) {
    return { ...result, error: `Company site unreachable: ${home.reason}` };
  }

  result.pagesUsed.push(companyUrl);
  result.companyInfo = extractText(home.html);

  // Get all links from homepage and score them
  const $ = cheerio.load(home.html);
  const linksWithText = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
    try {
      const resolved = new URL(href, companyUrl);
      if (resolved.hostname === new URL(companyUrl).hostname) {
        linksWithText.push({ url: resolved.href.split('#')[0], text });
      }
    } catch {}
  });

  // Score and sort links
  const scored = linksWithText
    .map(({ url, text }) => ({ url, text, score: scoreLink(url, text) }))
    .filter(l => l.score > 0)
    .sort((a, b) => b.score - a.score);

  const toVisit = [...new Set(scored.map(l => l.url))].slice(0, 10);

  emit?.(`Found ${toVisit.length} candidate pages to check...`);

  let pagesChecked = 0;
  for (const link of toVisit) {
    if (pagesChecked >= 8) break;
    if (result.pagesUsed.includes(link)) continue;

    const page = await fetchPage(link);
    pagesChecked++;

    if (!page.success || !page.html) continue;

    const text = extractText(page.html);
    const isHiringPage = HIRING_KEYWORDS.some(kw => text.toLowerCase().includes(kw));

    if (isHiringPage) {
      result.pagesUsed.push(link);
      result.hiringInfo += '\n\n--- Page: ' + link + ' ---\n' + text;
      result.hiringPageFound = true;
      emit?.(`Found hiring info at: ${link}`);
    }

    if (result.pagesUsed.length > 5) break;
  }

  return result;
}

module.exports = { crawlCompanySite, fetchPage, extractText };
