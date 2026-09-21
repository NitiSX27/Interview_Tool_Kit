const { URL } = require('url');

// Private/loopback CIDR ranges to block in production
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  '127.0.0.1',
]);

const BLOCKED_PREFIXES = [
  '10.',
  '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.',
  '172.24.', '172.25.', '172.26.', '172.27.',
  '172.28.', '172.29.', '172.30.', '172.31.',
  '192.168.',
];

/**
 * Validate and sanitise an external URL.
 * In production, rejects private/loopback addresses.
 * Always rejects non-HTTP(S) schemes.
 *
 * @param {string} raw  - user-supplied URL string
 * @returns {URL}       - parsed URL object
 * @throws              - if URL is invalid or disallowed
 */
function sanitiseURL(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('URL is required');

  let parsed;
  try {
    // Add scheme if missing
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    parsed = new URL(withScheme);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Disallowed URL scheme: ${parsed.protocol}`);
  }

  // In production block private addresses; in dev (e.g., batch tests against localhost) allow
  if (process.env.NODE_ENV === 'production') {
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(host)) {
      throw new Error(`Private address not allowed: ${host}`);
    }
    if (BLOCKED_PREFIXES.some((p) => host.startsWith(p))) {
      throw new Error(`Private address not allowed: ${host}`);
    }
  }

  return parsed;
}

/**
 * Resolve a potentially-relative link against a base URL.
 * Returns the absolute URL string, or null if invalid.
 */
function resolveURL(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

module.exports = { sanitiseURL, resolveURL };
