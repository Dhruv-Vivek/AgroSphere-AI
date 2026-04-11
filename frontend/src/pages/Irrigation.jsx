import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { AlertTriangle, CloudRain, Droplets, Loader2, MapPinned } from 'lucide-react'

import StatCard from '../components/StatCard.jsx'

const API_BASE = 'http://localhost:5000/api'
const DEFAULT_COORDS = { lat: 20.59, lon: 78.96 }

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

export default function Irrigation() {
  const [coords, setCoords] = useState(DEFAULT_COORDS)
  const [draftCoords, setDraftCoords] = useState({
    lat: String(DEFAULT_COORDS.lat),
    lon: String(DEFAULT_COORDS.lon),
  })
  const [crops, setCrops] = useState([])
  const [selectedCrop, setSelectedCrop] = useState('')
  const [cropGuide, setCropGuide] = useState(null)
  const [advice, setAdvice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingAdvice, setLoadingAdvice] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadInitial() {
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(`${API_BASE}/farm-intel/crops`, { timeout: 12000 })
        if (!active) return
        const cropList = asList(res.data)
        setCrops(cropList)
        if (cropList.length) {
          setSelectedCrop((current) => current || cropList[0].name)
        }
      } catch {
        if (active) setError('Unable to load crop list for irrigation planning.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInitial()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedCrop) return
    let active = true

    async function loadIrrigationData() {
      setLoadingAdvice(true)
      setError('')

      const [cropRes, adviceRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/irrigation/crop/${encodeURIComponent(selectedCrop)}`, {
          timeout: 12000,
        }),
        axios.get(`${API_BASE}/irrigation/advice`, {
          params: { crop: selectedCrop, ...coords },
          timeout: 15000,
        }),
      ])

      if (!active) return

      if (cropRes.status === 'fulfilled') {
        setCropGuide(cropRes.value.data?.data ?? null)
      } else {
        setCropGuide(null)
        setError('Unable to load crop irrigation plan.')
      }

      if (adviceRes.status === 'fulfilled') {
        setAdvice(adviceRes.value.data?.data ?? null)
      } else {
        setAdvice(null)
        setError((prev) => prev || 'Unable to load irrigation advice.')
      }

      setLoadingAdvice(false)
    }

    void loadIrrigationData()
    return () => {
      active = false
    }
  }, [selectedCrop, coords.lat, coords.lon])

  const applyCoordinates = () => {
    const lat = Number(draftCoords.lat)
    const lon = Number(draftCoords.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError('Latitude and longitude must be valid numbers.')
      return
    }
    setError('')
    setCoords({ lat, lon })
  }

  const irrigationStatus = useMemo(() => {
    const pop = Number(advice?.weather_hint?.avg_precip_probability_24h || 0)
    const rainLikely = Boolean(advice?.weather_hint?.rain_likely)
    if (rainLikely) {
      return {
        label: 'Delay irrigation',
        subtitle: 'Rain risk is high in the next 24-48 hours',
      }
    }
    if (pop < 0.2) {
      return {
        label: 'Irrigate if soil is dry',
        subtitle: 'Rain probability is weak; confirm with field moisture check',
      }
    }
    return {
      label: 'Monitor before next cycle',
      subtitle: 'Conditions are mixed; inspect soil depth before switching pumps on',
    }
  }, [advice])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Irrigation Planner</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Use crop-specific water needs and the latest forecast to decide whether to irrigate now,
              wait, or inspect the field first.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Crop
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-400"
              >
                {crops.map((crop) => (
                  <option key={crop.name} value={crop.name}>
                    {crop.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Latitude
              <input
                value={draftCoords.lat}
                onChange={(e) => setDraftCoords((prev) => ({ ...prev, lat: e.target.value }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Longitude
              <div className="flex gap-2">
                <input
                  value={draftCoords.lon}
                  onChange={(e) => setDraftCoords((prev) => ({ ...prev, lon: e.target.value }))}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={applyCoordinates}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <MapPinned className="h-4 w-4" aria-hidden />
                  Update
                </button>
              </div>
            </label>
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Action now"
          value={irrigationStatus.label}
          subtitle={irrigationStatus.subtitle}
          icon={<Droplets className="h-5 w-5" aria-hidden />}
          loading={loading || loadingAdvice}
        />
        <StatCard
          title="Rain probability"
          value={formatPercent(advice?.weather_hint?.avg_precip_probability_24h)}
          subtitle="Average next-24h precipitation chance"
          icon={<CloudRain className="h-5 w-5" aria-hidden />}
          loading={loadingAdvice}
        />
        <StatCard
          title="Water requirement"
          value={cropGuide?.water_requirement || '—'}
          subtitle="Relative crop demand"
          icon={<Droplets className="h-5 w-5" aria-hidden />}
          loading={loadingAdvice}
        />
        <StatCard
          title="Forecast posture"
          value={advice?.weather_hint?.rain_likely ? 'Rain likely' : 'No strong rain signal'}
          subtitle="Decision support from live forecast"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          loading={loadingAdvice}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-900/5 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Field recommendation
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                {selectedCrop || 'Select a crop'}
              </h2>
            </div>
            {loadingAdvice ? <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> : null}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
            <p className="text-sm font-semibold text-emerald-950">Current recommendation</p>
            <p className="mt-2 text-base leading-7 text-emerald-950">
              {advice?.suggestion || 'Waiting for the latest irrigation advice.'}
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Crop schedule
              </p>
              <p className="mt-3 text-sm leading-6 text-gray-700">
                {cropGuide?.irrigation_schedule || 'No irrigation schedule available for this crop.'}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Rainfall suitability
              </p>
              <p className="mt-3 text-sm text-gray-700">
                Expected crop range: {cropGuide?.rainfall_min ?? '—'}-{cropGuide?.rainfall_max ?? '—'} mm
              </p>
              <p className="mt-2 text-sm text-gray-700">
                Water need: {cropGuide?.water_requirement || '—'}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                Forecast hint: {advice?.weather_hint?.rain_likely ? 'possible rainfall event ahead' : 'no major rainfall event signaled'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-900/5 lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Forecast sample
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">Next observation windows</h2>

          <div className="mt-5 space-y-3">
            {(advice?.raw_forecast_sample || []).length ? (
              advice.raw_forecast_sample.map((slot) => (
                <div
                  key={slot.dt_txt}
                  className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
                >
                  <p className="text-sm font-semibold text-gray-900">{slot.dt_txt}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200">
                      Rain chance {formatPercent(slot.pop)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200">
                      Temp {slot?.main?.temp ?? '—'}°C
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200">
                      Humidity {slot?.main?.humidity ?? '—'}%
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200">
                      Rain 3h {slot?.rain?.['3h'] ?? 0} mm
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">Forecast samples will appear once advice loads.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
