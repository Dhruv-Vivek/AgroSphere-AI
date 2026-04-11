import { CloudSun, Droplets, RefreshCw, Wind, Loader2 } from 'lucide-react'

/**
 * @param {{
 *   weather: { city?: string, temp?: number, humidity?: number, description?: string, wind?: number },
 *   loading?: boolean,
 *   onRefresh?: () => void,
 * }} props
 */
export default function WeatherCard({ weather, loading, onRefresh }) {
  const city = weather?.city ?? '—'
  const temp = weather?.temp ?? '—'
  const humidity = weather?.humidity ?? '—'
  const wind = weather?.wind ?? '—'
  const description = weather?.description ?? '—'

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-emerald-50/60 p-6 shadow-sm ring-1 ring-gray-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Live weather
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{city}</h3>
          <p className="mt-0.5 text-sm capitalize text-gray-600">{description}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Refresh
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-6">
        {loading ? (
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
            <span className="text-sm text-gray-500">Fetching conditions…</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CloudSun className="h-8 w-8" aria-hidden />
              </div>
              <div>
                <p className="text-4xl font-bold tracking-tight text-gray-900">
                  {temp}
                  <span className="text-lg font-semibold text-gray-500">°C</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 ring-1 ring-gray-900/5">
                <Droplets className="h-4 w-4 text-emerald-600" aria-hidden />
                Humidity {humidity}%
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 ring-1 ring-gray-900/5">
                <Wind className="h-4 w-4 text-emerald-600" aria-hidden />
                Wind {wind} km/h
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
