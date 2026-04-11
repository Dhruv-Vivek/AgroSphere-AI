import axios from 'axios'

/**
 * Centralized market API client.
 * Base URL can be overridden via VITE_API_BASE_URL (include /api suffix if your backend mounts there).
 */
const RESOLVED_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:5000/api'

const DEFAULT_TIMEOUT_MS = 15000
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 800

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const client = axios.create({
  baseURL: RESOLVED_BASE.replace(/\/$/, ''),
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
})

/**
 * Performs an HTTP GET with bounded retries for transient network failures.
 * Retries on: no response, 502/503/504, 408, network error.
 * Does not retry on 4xx (except 408) to avoid hammering bad requests.
 * @param {string} urlPath path relative to baseURL, e.g. "/market/prices"
 * @param {{ signal?: AbortSignal }} [options]
 */
async function getWithRetry(urlPath, options = {}) {
  const { signal } = options
  let lastError

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    if (signal?.aborted) {
      const err = new Error('Request aborted')
      err.name = 'AbortError'
      throw err
    }
    try {
      const response = await client.get(urlPath, { signal })
      return response
    } catch (error) {
      lastError = error
      const status = error?.response?.status
      const code = error?.code
      const retryable =
        code === 'ECONNABORTED' ||
        code === 'ERR_NETWORK' ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        status === 408

      const shouldRetry = attempt < MAX_RETRIES && retryable
      if (!shouldRetry) break
      const backoff = RETRY_BASE_DELAY_MS * attempt
      await sleep(backoff)
    }
  }

  const wrapped = lastError instanceof Error ? lastError : new Error('Market API request failed')
  if (!wrapped.userMessage && lastError?.message) {
    wrapped.userMessage = lastError.message
  }
  throw wrapped
}

/** @returns {Promise<unknown>} */
export function fetchPrices(options = {}) {
  return getWithRetry('/market/prices', options).then((r) => r.data)
}

/** @returns {Promise<unknown>} */
export function fetchNews(options = {}) {
  return getWithRetry('/market/news', options).then((r) => r.data)
}

/** @returns {Promise<unknown>} */
export function fetchAnalysis(options = {}) {
  return getWithRetry('/market/analysis', options).then((r) => r.data)
}

export { RESOLVED_BASE as MARKET_API_BASE_URL }
