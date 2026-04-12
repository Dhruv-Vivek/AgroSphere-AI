import axios from 'axios'

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

function unwrapApiResponse(response) {
  const payload = response?.data
  if (payload && typeof payload === 'object' && payload.ok && payload.data !== undefined) {
    return payload.data
  }
  return payload
}

/** PRICES (UNCHANGED) */
export function fetchPrices(options = {}) {
  return getWithRetry('/market/prices', options).then((r) => unwrapApiResponse(r))
}

/** 🔥 FIXED NEWS FUNCTION */
export async function fetchNews(options = {}) {
  try {
    // 🔥 Add cache-busting params
    const timestamp = Date.now()
    const randomPage = Math.floor(Math.random() * 5) + 1

    const response = await getWithRetry(
      `/market/news?t=${timestamp}&page=${randomPage}`,
      options
    )

    const data = unwrapApiResponse(response)

    // 🔥 Shuffle so UI always updates
    if (Array.isArray(data)) {
      return [...data].sort(() => Math.random() - 0.5)
    }

    return data
  } catch (error) {
    console.error("News fetch failed:", error)
    return []
  }
}

/** ANALYSIS (UNCHANGED) */
export function fetchAnalysis(options = {}) {
  return getWithRetry('/market/analysis', options).then((r) => unwrapApiResponse(r))
}

export { RESOLVED_BASE as MARKET_API_BASE_URL }