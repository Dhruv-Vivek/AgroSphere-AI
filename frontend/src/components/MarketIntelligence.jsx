import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Table2,
  TrendingUp,
} from 'lucide-react'

import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'
import { fetchPrices, fetchNews, fetchAnalysis } from '../api/marketApi.js'
import { analyzeNewsRisk } from '../utils/riskAnalysis.js'
import {
  computePriceTrendDirection,
  recommendFromTrendAndRisk,
} from '../utils/recommendationEngine.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

/** Polling window: 15 minutes (within 10–30m requirement). */
const POLL_INTERVAL_MS = 15 * 60 * 1000

/**
 * @param {unknown} v
 * @returns {string[]}
 */
function asArray(v) {
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object') {
    const o = /** @type {Record<string, unknown>} */ (v)
    if (Array.isArray(o.data)) return o.data
    if (Array.isArray(o.items)) return o.items
    if (Array.isArray(o.results)) return o.results
    if (Array.isArray(o.articles)) return o.articles
    if (Array.isArray(o.news)) return o.news
    if (Array.isArray(o.prices)) return o.prices
    if (Array.isArray(o.rows)) return o.rows
  }
  return []
}

/**
 * @param {unknown} n
 * @returns {number|null}
 */
function sanitizePrice(n) {
  const x = Number(n)
  return Number.isFinite(x) && x >= 0 ? x : null
}

/**
 * @param {unknown} s
 */
function sanitizeCountry(s) {
  if (typeof s !== 'string') return null
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return null
  return t
    .split(' ')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
}

/**
 * Stable key for dedupe: geography + counterparty + commodity.
 * @param {Record<string, unknown>} row
 */
function rowDedupeKey(row) {
  const country = String(row.country || '')
  const company = String(row.company || '')
  const crop = String(row.crop || row.commodity || '')
  return `${country}|${company}|${crop}`.toLowerCase()
}

/**
 * Pull optional time-series from backend payloads (multiple shapes supported).
 * @param {unknown} analysis
 * @param {unknown} pricesRoot
 */
function extractGlobalTimeSeries(analysis, pricesRoot) {
  const series = []
  const a = analysis && typeof analysis === 'object' ? analysis : null
  if (a) {
    const ts = asArray(
      /** @type {Record<string, unknown>} */ (a).timeSeries ??
        /** @type {Record<string, unknown>} */ (a).series ??
        /** @type {Record<string, unknown>} */ (a).history,
    )
    for (const p of ts) {
      if (!p || typeof p !== 'object') continue
      const o = /** @type {Record<string, unknown>} */ (p)
      const t = String(o.date ?? o.t ?? o.time ?? o.timestamp ?? o.day ?? '')
      const price = sanitizePrice(o.price ?? o.close ?? o.value)
      if (t && price != null) series.push({ t, price })
    }
  }
  if (series.length >= 2) return series

  const prices = asArray(pricesRoot)
  for (const item of prices) {
    if (!item || typeof item !== 'object') continue
    const hist = asArray(/** @type {Record<string, unknown>} */ (item).history)
    for (const h of hist) {
      if (!h || typeof h !== 'object') continue
      const o = /** @type {Record<string, unknown>} */ (h)
      const t = String(o.date ?? o.t ?? o.time ?? o.timestamp ?? '')
      const price = sanitizePrice(o.price ?? o.value)
      if (t && price != null) series.push({ t, price })
    }
  }
  return series
}

/**
 * Aggregate latest validated rows for bar chart + table.
 * @param {unknown} pricesPayload
 */
function extractValidatedPriceRows(pricesPayload) {
  const raw = asArray(pricesPayload)
  /** @type {Record<string, unknown>[]} */
  const cleaned = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (item)
    const price = sanitizePrice(o.price ?? o.rate ?? o.value ?? o.spot)
    if (price == null) continue
    const country =
      sanitizeCountry(o.country ?? o.origin ?? o.region) ?? 'Unknown'
    const companyRaw = o.company ?? o.vendor ?? o.exchange ?? o.source
    const company =
      typeof companyRaw === 'string' && companyRaw.trim() ? companyRaw.trim() : '—'
    const crop = String(o.crop ?? o.commodity ?? o.name ?? o.item ?? '—')
    const history = asArray(o.history).filter(Boolean)
    cleaned.push({
      id: o.id,
      country,
      company,
      crop,
      price,
      history,
    })
  }
  const deduped = new Map()
  for (const r of cleaned) {
    const key = rowDedupeKey(r)
    if (!deduped.has(key)) deduped.set(key, r)
  }
  return [...deduped.values()]
}

/**
 * Country-level averages for bar chart (deterministic ordering by country name).
 * @param {ReturnType<typeof extractValidatedPriceRows>} rows
 */
function countryAverages(rows) {
  /** @type {Record<string, { sum: number, n: number }>} */
  const map = {}
  for (const r of rows) {
    if (!map[r.country]) map[r.country] = { sum: 0, n: 0 }
    map[r.country].sum += r.price
    map[r.country].n += 1
  }
  return Object.entries(map)
    .map(([country, { sum, n }]) => ({
      country,
      avg: n ? sum / n : 0,
    }))
    .sort((a, b) => a.country.localeCompare(b.country))
}

/**
 * @param {ReturnType<typeof extractValidatedPriceRows>} row
 * @param {{ t: string, price: number }[]} globalSeries
 */
function trendForRow(row, globalSeries) {
  const local = row.history
    .map((h) => {
      if (!h || typeof h !== 'object') return null
      const o = /** @type {Record<string, unknown>} */ (h)
      const t = String(o.date ?? o.t ?? o.time ?? o.timestamp ?? '')
      const price = sanitizePrice(o.price ?? o.value)
      if (!t || price == null) return null
      return { t, price }
    })
    .filter(Boolean)
  const series = local.length >= 2 ? local : globalSeries
  return computePriceTrendDirection(series)
}

/**
 * Map API errors to user-visible copy (no silent failures).
 * @param {unknown} err
 */
function describeError(err) {
  if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
    return 'Request cancelled.'
  }
  const code = err && typeof err === 'object' && 'code' in err ? err.code : null
  if (code === 'ECONNABORTED') {
    return 'The server took too long to respond (timeout). Check your connection and try again.'
  }
  if (code === 'ERR_NETWORK') {
    return 'Network error — verify that the API server is reachable.'
  }
  const status =
    err && typeof err === 'object' && err.response && typeof err.response === 'object'
      ? /** @type {{ status?: number }} */ (err.response).status
      : undefined
  if (typeof status === 'number') {
    return `Request failed with HTTP ${status}.`
  }
  if (err instanceof Error && err.message) return err.message
  return 'Unexpected error while loading market data.'
}

export default function MarketIntelligence() {
  const [initialLoad, setInitialLoad] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(/** @type {Date | null} */ (null))
  const [errors, setErrors] = useState(/** @type {string[]} */ ([]))
  const [pricesPayload, setPricesPayload] = useState(/** @type {unknown} */ (null))
  const [newsPayload, setNewsPayload] = useState(/** @type {unknown} */ (null))
  const [analysisPayload, setAnalysisPayload] = useState(/** @type {unknown} */ (null))

  /** Cached last-good snapshot for resilient UI on partial outages */
  const cacheRef = useRef({
    prices: /** @type {unknown} */ (null),
    news: /** @type {unknown} */ (null),
    analysis: /** @type {unknown} */ (null),
    at: /** @type {Date | null} */ (null),
  })

  const abortRef = useRef(/** @type {AbortController | null} */ (null))

  const load = useCallback(async ({ silent } = { silent: false }) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    if (!silent) {
      if (!cacheRef.current.at) setInitialLoad(true)
      else setRefreshing(true)
    }

    const nextErrors = []

    const settled = await Promise.allSettled([
      fetchPrices({ signal }),
      fetchNews({ signal }),
      fetchAnalysis({ signal }),
    ])

    if (signal.aborted) {
      setRefreshing(false)
      setInitialLoad(false)
      return
    }

    const [pRes, nRes, aRes] = settled

    let pricesData = cacheRef.current.prices
    if (pRes.status === 'fulfilled') {
      pricesData = pRes.value
      cacheRef.current.prices = pricesData
    } else {
      nextErrors.push(`Prices: ${describeError(pRes.reason)}`)
    }

    let newsData = cacheRef.current.news
    if (nRes.status === 'fulfilled') {
      newsData = nRes.value
      cacheRef.current.news = newsData
    } else {
      nextErrors.push(`News: ${describeError(nRes.reason)}`)
    }

    let analysisData = cacheRef.current.analysis
    if (aRes.status === 'fulfilled') {
      analysisData = aRes.value
      cacheRef.current.analysis = analysisData
    } else {
      nextErrors.push(`Analysis: ${describeError(aRes.reason)}`)
    }

    setPricesPayload(pricesData)
    setNewsPayload(newsData)
    setAnalysisPayload(analysisData)
    setErrors(nextErrors)

    const anySuccess = settled.some((s) => s.status === 'fulfilled')
    if (anySuccess) {
      const now = new Date()
      cacheRef.current.at = now
      setLastUpdated(now)
    }

    setInitialLoad(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void load({ silent: false })
    return () => {
      abortRef.current?.abort()
    }
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => {
      void load({ silent: true })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [load])

  const newsList = useMemo(() => asArray(newsPayload), [newsPayload])
  const riskProfile = useMemo(() => analyzeNewsRisk(newsList), [newsList])

  const validatedRows = useMemo(
    () => extractValidatedPriceRows(pricesPayload),
    [pricesPayload],
  )

  const globalSeries = useMemo(
    () => extractGlobalTimeSeries(analysisPayload, pricesPayload),
    [analysisPayload, pricesPayload],
  )

  const countryBars = useMemo(() => countryAverages(validatedRows), [validatedRows])

  const tableModel = useMemo(() => {
    return validatedRows.map((row, idx) => {
      const country = row.country || 'Unknown'
      const riskForRowLevel =
        riskProfile.byCountry[country] ?? riskProfile.overall ?? 'LOW'
      const trend = trendForRow(row, globalSeries)
      const recommendation = recommendFromTrendAndRisk({
        trend,
        riskLevel: riskForRowLevel,
      })
      const id =
        row.id != null && String(row.id).trim()
          ? String(row.id)
          : `${rowDedupeKey(row)}-${idx}`
      return {
        id,
        country,
        company: row.company,
        crop: row.crop,
        price: row.price,
        riskLevel: riskForRowLevel,
        recommendation,
      }
    })
  }, [validatedRows, riskProfile, globalSeries])

  const lineChartData = useMemo(() => {
    const labels = globalSeries.map((p) => p.t)
    return {
      labels,
      datasets: [
        {
          label: 'Price index',
          data: globalSeries.map((p) => p.price),
          borderColor: 'rgb(5, 150, 105)',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          tension: 0.25,
          fill: true,
          pointRadius: 2,
        },
      ],
    }
  }, [globalSeries])

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        y: { beginAtZero: false },
      },
    }),
    [],
  )

  const barChartData = useMemo(() => {
    return {
      labels: countryBars.map((c) => c.country),
      datasets: [
        {
          label: 'Average spot (validated)',
          data: countryBars.map((c) => c.avg),
          backgroundColor: 'rgba(16, 185, 129, 0.55)',
          borderColor: 'rgba(5, 120, 85, 0.9)',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }
  }, [countryBars])

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 12 } },
        y: { beginAtZero: true },
      },
    }),
    [],
  )

  const hasAnyData =
    validatedRows.length > 0 || globalSeries.length > 0 || newsList.length > 0
  const allFailed = errors.length === 3 && !hasAnyData
  const showCharts = globalSeries.length >= 2 || countryBars.length > 0

  const riskBadgeClass = (level) => {
    if (level === 'HIGH') return 'bg-red-50 text-red-800 ring-red-600/15'
    if (level === 'MEDIUM') return 'bg-amber-50 text-amber-900 ring-amber-600/15'
    return 'bg-emerald-50 text-emerald-900 ring-emerald-600/15'
  }

  const recBadgeClass = (rec) => {
    if (rec === 'BUY NOW') return 'bg-emerald-600 text-white'
    if (rec === 'WAIT') return 'bg-slate-800 text-white'
    return 'bg-gray-200 text-gray-900'
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <Navbar
          title="Market Intelligence"
          subtitle="Prices, geopolitical risk, and execution posture"
        />
        <main className="flex-1 overflow-auto bg-gray-50/80 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-medium text-gray-800 ring-1 ring-gray-200">
                  <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden />
                  Last updated:{' '}
                  <time dateTime={lastUpdated?.toISOString() ?? ''}>
                    {lastUpdated
                      ? lastUpdated.toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </time>
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                  Auto-refresh every {Math.round(POLL_INTERVAL_MS / 60000)} min
                </span>
              </div>
              <button
                type="button"
                onClick={() => void load({ silent: false })}
                disabled={refreshing || initialLoad}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing || initialLoad ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
                Refresh data
              </button>
            </div>

            {errors.length ? (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-900/10"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">Some sources could not be refreshed</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                    {cacheRef.current.at ? (
                      <p className="mt-2 text-xs text-amber-900/80">
                        Showing the last successful snapshot where available. Actions remain
                        conservative when data is stale or partial.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {initialLoad ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-24 text-gray-600 shadow-sm ring-1 ring-gray-900/5">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600" aria-hidden />
                <p className="mt-4 text-sm font-medium">Loading market intelligence…</p>
              </div>
            ) : null}

            {allFailed && !initialLoad ? (
              <div
                role="status"
                className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm ring-1 ring-red-900/5"
              >
                <ShieldAlert className="mx-auto h-10 w-10 text-red-600" aria-hidden />
                <p className="mt-4 text-lg font-semibold text-gray-900">Market data unavailable</p>
                <p className="mt-2 text-sm text-gray-600">
                  All upstream feeds failed after retries. Confirm the API is running and paths
                  <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-xs">
                    /market/prices
                  </code>
                  ,
                  <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-xs">/market/news</code>
                  , and
                  <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-xs">
                    /market/analysis
                  </code>
                  are deployed.
                </p>
              </div>
            ) : null}

            {!initialLoad && !hasAnyData && !allFailed ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-600 shadow-sm ring-1 ring-gray-900/5">
                <Table2 className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
                <p className="mt-4 text-lg font-semibold text-gray-900">No validated records</p>
                <p className="mt-2 text-sm">
                  APIs responded but returned nothing usable after validation and deduplication.
                </p>
              </div>
            ) : null}

            {!initialLoad && hasAnyData ? (
              <>
                <section className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                          Price trend
                        </h2>
                        <p className="mt-1 text-base font-semibold text-gray-900">
                          Time series (normalized)
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-4 h-72 w-full">
                      {globalSeries.length >= 2 ? (
                        <Line data={lineChartData} options={lineOptions} />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                          <p className="font-medium text-gray-800">Insufficient time-series points</p>
                          <p className="mt-2 max-w-md">
                            Provide at least two dated observations in{' '}
                            <code className="rounded bg-gray-100 px-1">analysis.timeSeries</code> or
                            per-row <code className="rounded bg-gray-100 px-1">history</code> on
                            prices.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                          Country comparison
                        </h2>
                        <p className="mt-1 text-base font-semibold text-gray-900">
                          Average validated spot by origin
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-4 h-72 w-full">
                      {countryBars.length ? (
                        <Bar data={barChartData} options={barOptions} />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                          <p className="font-medium text-gray-800">No country dimension</p>
                          <p className="mt-2 max-w-md">
                            Price rows need a recognizable <code className="rounded bg-gray-100 px-1">country</code>,{' '}
                            <code className="rounded bg-gray-100 px-1">origin</code>, or{' '}
                            <code className="rounded bg-gray-100 px-1">region</code> field to build
                            this chart.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {!showCharts && validatedRows.length ? (
                  <p className="text-xs text-gray-500">
                    Charts are optional when series or country buckets are missing; the decision
                    table below still reflects validated spot rows and news-derived risk.
                  </p>
                ) : null}

                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                        Decision table
                      </h2>
                      <p className="mt-1 text-base font-semibold text-gray-900">
                        Origin risk + price momentum → recommendation
                      </p>
                      <p className="text-xs text-gray-500">
                        Overall news risk:{' '}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${riskBadgeClass(riskProfile.overall)}`}>
                          {riskProfile.overall}
                        </span>
                        <span className="ml-2">
                          Parsed articles: {riskProfile.articleCount}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                            Country
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                            Company
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                            Crop
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                            Risk
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">
                            Recommendation
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {tableModel.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-gray-600">
                              No rows passed numeric validation.
                            </td>
                          </tr>
                        ) : (
                          tableModel.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/80">
                              <td className="px-4 py-3 font-semibold text-gray-900">{row.country}</td>
                              <td className="px-4 py-3 text-gray-800">{row.company}</td>
                              <td className="px-4 py-3 text-gray-800">{row.crop}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                                {row.price.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${riskBadgeClass(row.riskLevel)}`}
                                >
                                  {row.riskLevel}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${recBadgeClass(row.recommendation)}`}
                                >
                                  {row.recommendation}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
