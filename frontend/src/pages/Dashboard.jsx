import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Activity,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
  Sprout,
  TrendingDown,
  TrendingUp,
  ScanLine,
  Plane,
  LineChart,
  Sparkles,
  Loader2,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

import StatCard from '../components/StatCard.jsx'
import WeatherCard from '../components/WeatherCard.jsx'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const API_BASE = 'http://localhost:5000/api'

const FALLBACK_WEATHER = {
  city: 'Punjab Farm',
  temp: 28,
  humidity: 65,
  description: 'Partly cloudy',
  wind: 12,
}

const FALLBACK_STATS = {
  health: 87,
  alerts: 3,
  crops: 5,
  revenue: 45000,
}

const MOCK_ALERTS = [
  {
    id: 1,
    level: 'urgent',
    title: 'Soil moisture critical — Block C',
    time: '12 min ago',
    body: 'Moisture dropped below 18% for 2 consecutive readings.',
  },
  {
    id: 2,
    level: 'warning',
    title: 'Wind advisory for drone ops',
    time: '1 hr ago',
    body: 'Gusts up to 34 km/h may affect scheduled aerial survey.',
  },
  {
    id: 3,
    level: 'info',
    title: 'Irrigation cycle completed',
    time: '3 hr ago',
    body: 'Zone North-2 finished on schedule with 94% efficiency.',
  },
  {
    id: 4,
    level: 'warning',
    title: 'Market price dip: Wheat',
    time: '5 hr ago',
    body: 'Local mandi quotes down 2.1% vs 7-day average.',
  },
  {
    id: 5,
    level: 'info',
    title: 'Sensor calibration due',
    time: 'Yesterday',
    body: 'Weather station WS-04 due for quarterly calibration.',
  },
]

const FALLBACK_CROP_HEALTH = {
  labels: ['Wheat', 'Rice', 'Corn', 'Soybean', 'Cotton', 'Sugarcane'],
  values: [92, 88, 76, 84, 71, 90],
}

const FALLBACK_MARKET_ROWS = [
  { crop: 'Wheat', price: 2450, trend: 'up' },
  { crop: 'Rice', price: 3120, trend: 'up' },
  { crop: 'Corn', price: 1980, trend: 'down' },
]

function normalizeWeather(payload) {
  if (!payload || typeof payload !== 'object') return { ...FALLBACK_WEATHER }
  const d = payload.data ?? payload.weather ?? payload
  return {
    city: d.city ?? d.location ?? d.name ?? FALLBACK_WEATHER.city,
    temp: Number(d.temp ?? d.temperature ?? d.main?.temp ?? FALLBACK_WEATHER.temp),
    humidity: Number(d.humidity ?? d.main?.humidity ?? FALLBACK_WEATHER.humidity),
    description: String(
      d.description ?? d.weather?.[0]?.description ?? FALLBACK_WEATHER.description,
    ),
    wind: Number(d.wind ?? d.wind_speed ?? d.windSpeed ?? FALLBACK_WEATHER.wind),
  }
}

function normalizeDashboardStats(payload) {
  if (!payload || typeof payload !== 'object') return { ...FALLBACK_STATS }
  const d = payload.data ?? payload.stats ?? payload.dashboard ?? payload
  const health = Number(
    d.health ?? d.farmHealthScore ?? d.healthScore ?? FALLBACK_STATS.health,
  )
  const alerts = Number(d.alerts ?? d.activeAlerts ?? FALLBACK_STATS.alerts)
  const crops = Number(d.crops ?? d.cropsGrowing ?? d.activeCrops ?? FALLBACK_STATS.crops)
  const revenue = Number(
    d.revenue ?? d.todayRevenue ?? d.revenueEstimate ?? FALLBACK_STATS.revenue,
  )
  return {
    health: Number.isFinite(health) ? health : FALLBACK_STATS.health,
    alerts: Number.isFinite(alerts) ? alerts : FALLBACK_STATS.alerts,
    crops: Number.isFinite(crops) ? crops : FALLBACK_STATS.crops,
    revenue: Number.isFinite(revenue) ? revenue : FALLBACK_STATS.revenue,
  }
}

function normalizePricesList(payload) {
  const raw = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.prices ?? payload?.crops ?? []
  if (!Array.isArray(raw) || raw.length === 0) return [...FALLBACK_MARKET_ROWS]
  const mapped = raw.map((row, i) => {
    const crop =
      row.crop ?? row.name ?? row.commodity ?? row.item ?? `Crop ${i + 1}`
    const price = Number(row.price ?? row.rate ?? row.value ?? 0)
    const trendRaw = (row.trend ?? row.change ?? row.direction ?? '').toString().toLowerCase()
    let trend = 'flat'
    if (trendRaw.includes('down') || Number(row.changePercent) < 0) trend = 'down'
    else if (trendRaw.includes('up') || Number(row.changePercent) > 0) trend = 'up'
    else if (i % 3 === 0) trend = 'up'
    else if (i % 3 === 1) trend = 'down'
    return { crop: String(crop), price: Number.isFinite(price) ? price : 0, trend }
  })
  return mapped
    .filter((r) => r.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)
}

function normalizeCropHealthChart(payload) {
  const d = payload?.cropHealth ?? payload?.healthByCrop ?? payload?.crops ?? payload
  if (Array.isArray(d) && d.length > 0) {
    const labels = d.map(
      (x, i) => x.crop ?? x.name ?? x.label ?? FALLBACK_CROP_HEALTH.labels[i % 6],
    )
    const values = d.map((x, i) =>
      Number(x.health ?? x.score ?? x.value ?? FALLBACK_CROP_HEALTH.values[i % 6]),
    )
    return { labels, values }
  }
  return { ...FALLBACK_CROP_HEALTH }
}

function formatInr(n) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`
  }
}

function badgeClasses(level) {
  if (level === 'urgent')
    return 'bg-red-50 text-red-700 ring-red-600/10 border border-red-100'
  if (level === 'warning')
    return 'bg-amber-50 text-amber-800 ring-amber-600/10 border border-amber-100'
  return 'bg-emerald-50 text-emerald-800 ring-emerald-600/10 border border-emerald-100'
}

export default function Dashboard() {
  const [stats, setStats] = useState(FALLBACK_STATS)
  const [statsLoading, setStatsLoading] = useState(true)
  const [weather, setWeather] = useState(FALLBACK_WEATHER)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [marketRows, setMarketRows] = useState(FALLBACK_MARKET_ROWS)
  const [marketLoading, setMarketLoading] = useState(true)
  const [cropHealth, setCropHealth] = useState(FALLBACK_CROP_HEALTH)
  const [chartLoading, setChartLoading] = useState(true)
  const [alertsTick, setAlertsTick] = useState(0)

  const fetchDashboard = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/dashboard`, { timeout: 8000 })
      setStats(normalizeDashboardStats(res.data))
    } catch {
      setStats({ ...FALLBACK_STATS })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/farm/weather`, {
        params: { lat: 20.59, lon: 78.96 },
        timeout: 8000,
      })
      setWeather(normalizeWeather(res.data))
    } catch {
      setWeather({ ...FALLBACK_WEATHER })
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  const fetchMarketSnapshot = useCallback(async () => {
    setMarketLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/market/prices`, { timeout: 8000 })
      const top = normalizePricesList(res.data)
      setMarketRows(top.length ? top : FALLBACK_MARKET_ROWS)
    } catch {
      setMarketRows([...FALLBACK_MARKET_ROWS])
    } finally {
      setMarketLoading(false)
    }
  }, [])

  const fetchCropHealth = useCallback(async () => {
    setChartLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/dashboard`, { timeout: 8000 })
      setCropHealth(normalizeCropHealthChart(res.data))
    } catch {
      setCropHealth({ ...FALLBACK_CROP_HEALTH })
    } finally {
      setChartLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDashboard()
    void fetchWeather()
    void fetchMarketSnapshot()
    void fetchCropHealth()
  }, [fetchDashboard, fetchWeather, fetchMarketSnapshot, fetchCropHealth])

  const chartData = useMemo(
    () => ({
      labels: cropHealth.labels,
      datasets: [
        {
          label: 'Health index',
          data: cropHealth.values,
          backgroundColor: 'rgba(16, 185, 129, 0.55)',
          borderColor: 'rgba(5, 150, 105, 0.9)',
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 22,
        },
      ],
    }),
    [cropHealth],
  )

  const chartOptions = useMemo(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.x
              return `${v}% vitality`
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(15, 23, 42, 0.06)' },
          ticks: { color: '#475569', font: { size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#1e293b', font: { size: 12, weight: '600' } },
        },
      },
    }),
    [],
  )

  const onQuickAction = (label) => {
    toast.success(`${label} — queued for your farm workspace.`)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Overview
                  </h2>
                  <p className="text-base font-semibold text-gray-900">Key performance</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void fetchDashboard()
                    toast.success('Stats refreshed')
                  }}
                  disabled={statsLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {statsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden />
                  )}
                  Refresh all stats
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Farm health score"
                  value={`${stats.health}%`}
                  subtitle="Composite soil + crop signals"
                  loading={statsLoading}
                  icon={<Activity className="h-5 w-5" aria-hidden />}
                />
                <StatCard
                  title="Active alerts"
                  value={stats.alerts}
                  subtitle="Needs review or action"
                  loading={statsLoading}
                  icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
                />
                <StatCard
                  title="Crops growing"
                  value={stats.crops}
                  subtitle="Across monitored parcels"
                  loading={statsLoading}
                  icon={<Sprout className="h-5 w-5" aria-hidden />}
                />
                <StatCard
                  title="Today’s revenue estimate"
                  value={formatInr(stats.revenue)}
                  subtitle="Based on latest mandi quotes"
                  loading={statsLoading}
                  icon={<IndianRupee className="h-5 w-5" aria-hidden />}
                />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <WeatherCard
                  weather={weather}
                  loading={weatherLoading}
                  onRefresh={() => void fetchWeather()}
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-900/5 lg:col-span-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Quick actions
                    </h2>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      Launch high-impact workflows
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: 'Disease scan',
                      desc: 'Multispectral leaf analysis',
                      icon: ScanLine,
                      onClick: () => onQuickAction('Disease scan'),
                    },
                    {
                      label: 'Start drone',
                      desc: 'Autonomous field mapping',
                      icon: Plane,
                      onClick: () => onQuickAction('Drone mission'),
                    },
                    {
                      label: 'Check market',
                      desc: 'Mandi spreads & futures',
                      icon: LineChart,
                      onClick: () => onQuickAction('Market desk'),
                    },
                    {
                      label: 'Get AI advice',
                      desc: 'Context-aware agronomy',
                      icon: Sparkles,
                      onClick: () => onQuickAction('AI agronomist'),
                    },
                  ].map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={a.onClick}
                      className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 text-left shadow-sm ring-1 ring-gray-900/5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-900/20">
                        <a.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900">
                          {a.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-600">{a.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-12">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-900/5 lg:col-span-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Crop health overview
                    </h2>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      Relative vitality by crop line
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchCropHealth()}
                    disabled={chartLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {chartLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Refresh
                  </button>
                </div>
                <div className="relative mt-4 h-72 w-full">
                  {chartLoading ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-hidden />
                      <p className="mt-2 text-sm font-medium text-gray-600">Loading chart…</p>
                    </div>
                  ) : null}
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-900/5 lg:col-span-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Recent alerts
                    </h2>
                    <p className="mt-1 text-base font-semibold text-gray-900">Signal feed</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAlertsTick((t) => t + 1)
                      toast.success('Alerts refreshed')
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    Refresh
                  </button>
                </div>
                <ul key={alertsTick} className="mt-4 space-y-3">
                  {MOCK_ALERTS.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4 ring-1 ring-gray-900/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${badgeClasses(a.level)}`}
                            >
                              {a.level}
                            </span>
                            <span className="text-xs text-gray-500">{a.time}</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-gray-900">{a.title}</p>
                          <p className="mt-1 text-sm text-gray-600">{a.body}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Market snapshot
                  </h2>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    Top crops by spot quote
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchMarketSnapshot()}
                  disabled={marketLoading}
                  className="inline-flex items-center gap-1.5 self-start rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {marketLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Refresh
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                        Crop
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                        Spot (₹ / quintal)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {marketLoading ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-gray-500">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                            Loading market data…
                          </span>
                        </td>
                      </tr>
                    ) : (
                      marketRows.map((row) => (
                        <tr key={row.crop} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3 font-semibold text-gray-900">{row.crop}</td>
                          <td className="px-4 py-3 text-gray-800">
                            ₹{Math.round(row.price).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.trend === 'down' ? (
                              <span className="inline-flex items-center justify-end gap-1 font-semibold text-red-600">
                                <TrendingDown className="h-4 w-4" aria-hidden />
                                Down
                              </span>
                            ) : row.trend === 'up' ? (
                              <span className="inline-flex items-center justify-end gap-1 font-semibold text-emerald-600">
                                <TrendingUp className="h-4 w-4" aria-hidden />
                                Up
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-end gap-1 font-semibold text-gray-600">
                                Flat
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Offline-safe: if the API is unreachable, AgroSphere shows the last known good
                estimates for demo continuity.
              </p>
            </section>
    </div>
  )
}
