/**
 * researcher.js
 *
 * Searches for public discussion about a company's interview process.
 * Uses DuckDuckGo HTML search (no API key required).
 *
 * Strategy:
 *   - Query: "<company> interview process site:glassdoor.com OR site:reddit.com OR site:levels.fyi"
 *   - Parse result snippets from DDG HTML response
 *   - Return a summary of what was found (text snippets only — not fetching those external pages)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { sleep } = require('../utils/retry');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const TIMEOUT = 10000;

/**
 * Search DuckDuckGo HTML for public discussion about company interviews.
 *
 * @param {string} companyName
 * @returns {Promise<string>} - raw text of snippets found, or empty string
 */
async function searchPublicDiscussion(companyName) {
  if (!companyName) return '';

  const query = encodeURIComponent(
    `"${companyName}" interview process experience glassdoor reddit`
  );

  try {
    // DuckDuckGo HTML endpoint
    const url = `https://html.duckduckgo.com/html/?q=${query}`;
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html',
      },
      responseType: 'text',
    });

    const $ = cheerio.load(response.data);
    const snippets = [];

    // DDG result snippets are in .result__snippet
    $('.result__snippet, .result__body').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) snippets.push(text);
    });

    if (snippets.length === 0) {
      console.warn('[RESEARCHER] No public discussion snippets found for:', companyName);
      return '';
    }

    return snippets.slice(0, 8).join('\n\n').slice(0, 4000);
  } catch (err) {
    console.warn('[RESEARCHER] Public discussion search failed:', err.message);
    return '';
  }
}

/**
 * Extract a likely company name from a URL or fallback string.
 */
function extractCompanyName(companyUrl) {
  try {
    const hostname = new URL(companyUrl).hostname;
    // e.g., "www.acme.com" → "acme"  |  "about.gitlab.com" → "gitlab"
    return hostname
      .replace(/^www\./, '')
      .split('.')
      .slice(0, -1) // remove TLD
      .join(' ');
  } catch {
    return companyUrl;
  }
}

module.exports = { searchPublicDiscussion, extractCompanyName };
