/**
 * crawler.js
 *
 * Crawls a company website to find:
 *   1. The homepage / about page text
 *   2. The best "hiring / careers" page
 *
 * Strategy:
 *   - Fetch homepage, parse all links
 *   - Score each link using keywords (careers, jobs, hiring, about, team, culture…)
 *   - Fetch the top N scored links, respect robots.txt, rate-limit between requests
 *   - Return { aboutPage, hiringPage, pagesUsed }
 */

const axios = require('axios');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const { resolveURL } = require('../utils/urlSanitise');
const { sleep } = require('../utils/retry');

const MAX_PAGES = parseInt(process.env.MAX_CRAWL_PAGES || '10', 10);
const CRAWL_DELAY = parseInt(process.env.CRAWL_DELAY_MS || '500', 10);
const FETCH_TIMEOUT = 10000;
const MAX_CONTENT_BYTES = 500_000;

const USER_AGENT = 'InterviewPrepBot/1.0 (research; contact: prep@example.com)';

// Keyword scores for link ranking
const HIRING_KEYWORDS = [
  { pattern: /careers?\b/i, score: 10 },
  { pattern: /jobs?\b/i, score: 9 },
  { pattern: /hiring\b/i, score: 10 },
  { pattern: /work-?with-?us/i, score: 8 },
  { pattern: /join-?(us|team)/i, score: 8 },
  { pattern: /open-?positions?/i, score: 7 },
  { pattern: /handbook/i, score: 6 },
  { pattern: /engineering-?blog/i, score: 5 },
  { pattern: /culture/i, score: 4 },
  { pattern: /interview-?process/i, score: 10 },
];

const ABOUT_KEYWORDS = [
  { pattern: /about(-us)?\b/i, score: 8 },
  { pattern: /company\b/i, score: 6 },
  { pattern: /who-?we-?are/i, score: 8 },
  { pattern: /mission\b/i, score: 5 },
  { pattern: /story\b/i, score: 4 },
  { pattern: /team\b/i, score: 4 },
  { pattern: /overview/i, score: 4 },
];

/**
 * Fetch a URL, enforcing content-type and size limits.
 * Returns { text, finalUrl } or null on failure.
 */
async function fetchPage(url, robotsRules = null) {
  try {
    // Respect robots.txt
    if (robotsRules && !robotsRules.isAllowed(url, USER_AGENT)) {
      console.warn(`[CRAWLER] robots.txt disallows: ${url}`);
      return null;
    }

    const response = await axios.get(url, {
      timeout: FETCH_TIMEOUT,
      maxContentLength: MAX_CONTENT_BYTES,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
      responseType: 'text',
      validateStatus: (s) => s < 400,
    });

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return null; // Skip non-HTML
    }

    return { text: response.data, finalUrl: response.request?.res?.responseUrl || url };
  } catch (err) {
    console.warn(`[CRAWLER] Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

/**
 * Extract clean text from HTML.
 */
function extractText($) {
  // Remove noise elements
  $('script, style, noscript, nav, footer, header, [aria-hidden="true"]').remove();
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
}

/**
 * Extract all internal links from a page.
 */
function extractLinks($, baseUrl) {
  const base = new URL(baseUrl);
  const links = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const resolved = resolveURL(href, baseUrl);
    if (!resolved) return;

    try {
      const parsed = new URL(resolved);
      // Only same-origin links
      if (parsed.hostname !== base.hostname) return;
      // Drop fragments, query-string-heavy URLs
      parsed.hash = '';
      const clean = parsed.href;
      links.add(clean);
    } catch {
      // ignore
    }
  });

  return Array.from(links);
}

/**
 * Score a URL for relevance to a keyword list.
 */
function scoreLink(url, keywords) {
  let score = 0;
  for (const { pattern, score: s } of keywords) {
    if (pattern.test(url)) score += s;
  }
  return score;
}

/**
 * Fetch and parse robots.txt for a site.
 */
async function fetchRobots(baseUrl) {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const res = await axios.get(robotsUrl, { timeout: 5000, responseType: 'text' });
    return robotsParser(robotsUrl, res.data);
  } catch {
    return null; // Treat missing robots.txt as fully permissive
  }
}

/**
 * Main crawl function.
 *
 * @param {string} companyUrl  - company homepage URL
 * @param {Function} [onProgress] - optional callback(step, message)
 * @returns {{ homepageText, aboutText, hiringText, pagesUsed: string[] }}
 */
async function crawlCompany(companyUrl, onProgress = () => {}) {
  const pagesUsed = [];
  const result = { homepageText: '', aboutText: '', hiringText: '', pagesUsed };

  onProgress('crawl', `Fetching homepage: ${companyUrl}`);

  // Step 1: Fetch homepage
  const robots = await fetchRobots(companyUrl);
  const homepageResult = await fetchPage(companyUrl, robots);

  if (!homepageResult) {
    console.warn('[CRAWLER] Homepage unreachable');
    return result;
  }

  const $ = cheerio.load(homepageResult.text);
  result.homepageText = extractText($);
  pagesUsed.push(homepageResult.finalUrl);

  // Step 2: Extract and score internal links
  const allLinks = extractLinks($, homepageResult.finalUrl);

  const scored = allLinks.map((link) => ({
    link,
    hiringScore: scoreLink(link, HIRING_KEYWORDS),
    aboutScore: scoreLink(link, ABOUT_KEYWORDS),
  }));

  // Top hiring candidates
  const hiringCandidates = scored
    .filter((l) => l.hiringScore > 0)
    .sort((a, b) => b.hiringScore - a.hiringScore)
    .slice(0, 5)
    .map((l) => l.link);

  // Top about candidates (not already in hiring)
  const hiringSet = new Set(hiringCandidates);
  const aboutCandidates = scored
    .filter((l) => l.aboutScore > 0 && !hiringSet.has(l.link))
    .sort((a, b) => b.aboutScore - a.aboutScore)
    .slice(0, 3)
    .map((l) => l.link);

  let pagesChecked = 0;

  // Step 3: Fetch about pages
  for (const link of aboutCandidates) {
    if (pagesChecked >= MAX_PAGES) break;
    await sleep(CRAWL_DELAY);
    onProgress('crawl', `Fetching about page: ${link}`);
    const pageResult = await fetchPage(link, robots);
    pagesChecked++;
    if (!pageResult) continue;
    const $page = cheerio.load(pageResult.text);
    result.aboutText += ' ' + extractText($page);
    pagesUsed.push(link);
    if (result.aboutText.length > 5000) break;
  }

  // Step 4: Fetch hiring pages
  for (const link of hiringCandidates) {
    if (pagesChecked >= MAX_PAGES) break;
    await sleep(CRAWL_DELAY);
    onProgress('crawl', `Fetching hiring page: ${link}`);
    const pageResult = await fetchPage(link, robots);
    pagesChecked++;
    if (!pageResult) continue;
    const $page = cheerio.load(pageResult.text);
    const text = extractText($page);
    result.hiringText += ' ' + text;
    pagesUsed.push(link);
    if (result.hiringText.length > 5000) break;
  }

  result.aboutText = result.aboutText.trim().slice(0, 8000);
  result.hiringText = result.hiringText.trim().slice(0, 8000);

  onProgress('crawl', `Crawl complete. Pages fetched: ${pagesUsed.length}`);
  return result;
}

module.exports = { crawlCompany };
