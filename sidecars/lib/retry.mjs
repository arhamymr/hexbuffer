const DEFAULTS = {
  maxAttempts: 3,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Returns true if the error is likely transient (retryable).
 * Matches network errors, timeouts, rate limits, and 5xx server errors.
 * Does NOT match auth errors (401), forbidden (403), not found (404),
 * or validation errors — those are permanent.
 */
export function isTransientError(error) {
  if (!error) return true;
  const msg = (error.message || '').toLowerCase();
  if (/econnrefused|econnreset|enotfound|etimedout|eai_again/i.test(msg)) return true;
  if (/network|fetch failed|abort|timeout/i.test(msg)) return true;
  if (/429|502|503|504/i.test(msg)) return true;
  if (/rate.?limit|too.?many.?requests/i.test(msg)) return true;
  if (/server.?error|service.?unavailable|temporary|retry|overloaded|capacity/i.test(msg)) return true;
  return false;
}

function getMaxAttempts(override) {
  if (override !== undefined) return override;
  const env = process.env['0XBUFFER_MAX_RETRIES'];
  if (env !== undefined) {
    const parsed = Number.parseInt(env, 10);
    if (Number.isFinite(parsed) && parsed >= 1) return parsed;
  }
  return DEFAULTS.maxAttempts;
}

/**
 * Wraps an async function with exponential backoff retry.
 *
 * @param {Function} fn - Async function to retry. Called fresh on each attempt.
 * @param {Object} [options]
 * @param {number} [options.maxAttempts] - Max total attempts (default 3, env 0XBUFFER_MAX_RETRIES overrides)
 * @param {number} [options.initialDelayMs] - Initial delay in ms (default 500)
 * @param {number} [options.backoffMultiplier] - Backoff multiplier (default 2)
 * @param {number} [options.maxDelayMs] - Max delay cap in ms (default 10000)
 * @param {Function} [options.retryOn] - Predicate (error) => boolean. Use isTransientError by default.
 * @param {string} [options.name] - Human-readable label for log output
 * @returns {Promise} Result of fn()
 */
export async function withRetry(fn, options = {}) {
  const maxAttempts = getMaxAttempts(options.maxAttempts);
  const initialDelayMs = options.initialDelayMs ?? DEFAULTS.initialDelayMs;
  const backoffMultiplier = options.backoffMultiplier ?? DEFAULTS.backoffMultiplier;
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const retryOn = options.retryOn ?? isTransientError;
  const name = options.name ?? 'operation';

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = retryOn(error);

      if (attempt < maxAttempts && retryable) {
        const delay = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
        process.stderr.write(
          `[ai-engine] retry: ${name} attempt ${attempt}/${maxAttempts} failed (${error.message}), retrying in ${delay}ms\n`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        if (!retryable) {
          process.stderr.write(`[ai-engine] retry: ${name} failed with non-retryable error: ${error.message}\n`);
        }
        throw error;
      }
    }
  }

  throw lastError;
}
