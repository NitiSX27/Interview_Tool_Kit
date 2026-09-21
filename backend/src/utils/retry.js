/**
 * Exponential backoff retry helper.
 *
 * @param {Function} fn      - async function to retry
 * @param {Object}   opts
 * @param {number}   opts.maxRetries  - max attempts (default 5)
 * @param {number}   opts.baseDelay   - initial delay ms (default 1000)
 * @param {number}   opts.maxDelay    - max delay ms (default 32000)
 */
async function withRetry(fn, { maxRetries = 5, baseDelay = 1000, maxDelay = 32000 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.toLowerCase().includes('rate') ||
        err?.message?.toLowerCase().includes('quota') ||
        err?.message?.toLowerCase().includes('resource_exhausted');

      if (attempt >= maxRetries) {
        throw err;
      }

      // Only retry on rate-limit / transient errors
      if (!isRateLimit && err?.status && err.status < 500) {
        throw err;
      }

      // Exponential backoff + full jitter
      const cap = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const delay = Math.random() * cap;
      console.warn(`[RETRY] attempt ${attempt}/${maxRetries}, waiting ${Math.round(delay)}ms — ${err.message}`);
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { withRetry, sleep };
