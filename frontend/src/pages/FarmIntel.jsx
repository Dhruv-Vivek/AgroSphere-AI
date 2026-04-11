import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  BadgeIndianRupee,
  CloudSun,
  Droplets,
  Loader2,
  RefreshCw,
  Sprout,
  Thermometer,
} from 'lucide-react'

import StatCard from '../components/StatCard.jsx'
import WeatherCard from '../components/WeatherCard.jsx'

const API_BASE = 'http://localhost:5000/api'
const DEFAULT_COORDS = { lat: 20.59, lon: 78.96 }

function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function normalizeWeather(payload) {
  const d = payload?.data ?? payload ?? {}
  return {
    city: d?.name ?? d?.city ?? 'Farm location',
    temp: Number(d?.main?.temp ?? d?.temp ?? 0),
    humidity: Number(d?.main?.humidity ?? d?.humidity ?? 0),
    description: String(d?.weather?.[0]?.description ?? d?.description ?? '—'),
    wind: Number(d?.wind?.speed ?? d?.wind ?? 0),
  }
}

function formatCurrency(value) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
  }
}

export default function FarmIntel() {
  const [coords, setCoords] = useState(DEFAULT_COORDS)
  const [draftCoords, setDraftCoords] = useState({
    lat: String(DEFAULT_COORDS.lat),
    lon: String(DEFAULT_COORDS.lon),
  })
  const [crops, setCrops] = useState([])
  const [selectedCrop, setSelectedCrop] = useState('')
  const [cropDetails, setCropDetails] = useState(null)
  const [weather, setWeather] = useState(null)
  const [loadingCrops, setLoadingCrops] = useState(true)
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [loadingCrop, setLoadingCrop] = useState(false)
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    let active = true

    async function loadInitial() {
      setLoadingCrops(true)
      setLoadingWeather(true)
      setPageError('')

      const [cropRes, weatherRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/farm-intel/crops`, { timeout: 12000 }),
        axios.get(`${API_BASE}/farm-intel/weather`, {
          params: coords,
          timeout: 12000,
        }),
      ])

      if (!active) return

      if (cropRes.status === 'fulfilled') {
        const cropList = asList(cropRes.value.data)
        setCrops(cropList)
        if (!selectedCrop && cropList.length) {
          const first = cropList[0]?.name ?? ''
          setSelectedCrop(first)
          setCropDetails(cropList[0] ?? null)
        }
      } else {
        setPageError('Unable to load crop intelligence right now.')
      }

      if (weatherRes.status === 'fulfilled') {
        setWeather(normalizeWeather(weatherRes.value.data))
      } else {
        setPageError((prev) => prev || 'Unable to load live weather right now.')
      }

      setLoadingCrops(false)
      setLoadingWeather(false)
    }

    void loadInitial()
    return () => {
      active = false
    }
  }, [coords.lat, coords.lon])

  useEffect(() => {
    if (!selectedCrop) return
    let active = true

    async function loadCropDetails() {
      setLoadingCrop(true)
      try {
        const res = await axios.get(
          `${API_BASE}/farm-intel/crops/${encodeURIComponent(selectedCrop)}`,
          { timeout: 12000 },
        )
        if (!active) return
        setCropDetails(res.data?.data ?? null)
      } catch {
        if (!active) return
        setPageError('Unable to load selected crop details.')
      } finally {
        if (active) setLoadingCrop(false)
      }
    }

    void loadCropDetails()
    return () => {
      active = false
    }
  }, [selectedCrop])

  const quickStats = useMemo(() => {
    if (!cropDetails) {
      return {
        duration: '—',
        yield: '—',
        revenue: '—',
        water: '—',
      }
    }

    const expectedRevenue =
      Number(cropDetails?.yield_per_acre || 0) * 100 * Number(cropDetails?.market_price_per_kg || 0)

    return {
      duration: `${cropDetails.duration_days || '—'} days`,
      yield: `${cropDetails.yield_per_acre || '—'} qtl/acre`,
      revenue: expectedRevenue ? formatCurrency(expectedRevenue) : '—',
      water: cropDetails.water_requirement || '—',
    }
  }, [cropDetails])

  const compatibility = useMemo(() => {
    if (!cropDetails || !weather) return { tempFit: 'Unknown', humidityNote: 'Weather data loading.' }

    const temp = Number(weather.temp)
    const min = Number(cropDetails.temp_min)
    const max = Number(cropDetails.temp_max)
    const tempFit =
      Number.isFinite(temp) && Number.isFinite(min) && Number.isFinite(max)
        ? temp >= min && temp <= max
          ? 'Within crop comfort range'
          : temp > max
          ? 'Warmer than ideal'
          : 'Cooler than ideal'
        : 'Unknown'

    const humidityNote =
      Number(weather.humidity) >= 80
        ? 'Humidity is elevated; watch disease pressure and leaf wetness.'
        : Number(weather.humidity) <= 35
        ? 'Dry air can increase transpiration stress; inspect moisture deficit.'
        : 'Humidity is moderate for field operations.'

    return { tempFit, humidityNote }
  }, [cropDetails, weather])

  const applyCoordinates = () => {
    const lat = Number(draftCoords.lat)
    const lon = Number(draftCoords.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setPageError('Latitude and longitude must be valid numbers.')
      return
    }
    setPageError('')
    setCoords({ lat, lon })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Farm Intelligence</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Review crop suitability, revenue potential, climate fit, and operational notes
              from your live farm coordinates.
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
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Apply
                </button>
              </div>
            </label>
          </div>
        </div>
        {pageError ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {pageError}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Crop cycle"
          value={quickStats.duration}
          subtitle="Expected duration"
          icon={<Sprout className="h-5 w-5" aria-hidden />}
          loading={loadingCrop}
        />
        <StatCard
          title="Expected yield"
          value={quickStats.yield}
          subtitle="Per acre estimate"
          icon={<Droplets className="h-5 w-5" aria-hidden />}
          loading={loadingCrop}
        />
        <StatCard
          title="Revenue potential"
          value={quickStats.revenue}
          subtitle="Yield × current market price"
          icon={<BadgeIndianRupee className="h-5 w-5" aria-hidden />}
          loading={loadingCrop}
        />
        <StatCard
          title="Water need"
          value={quickStats.water}
          subtitle="Relative irrigation intensity"
          icon={<CloudSun className="h-5 w-5" aria-hidden />}
          loading={loadingCrop}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <WeatherCard
            weather={weather}
            loading={loadingWeather}
            onRefresh={applyCoordinates}
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-900/5 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Crop briefing
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                {selectedCrop || 'Select a crop'}
              </h2>
            </div>
            {loadingCrop ? <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> : null}
          </div>

          {cropDetails ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Climate fit
                </p>
                <p className="mt-3 text-sm font-semibold text-gray-900">{compatibility.tempFit}</p>
                <p className="mt-2 text-sm text-gray-600">
                  Ideal temperature: {cropDetails.temp_min}°C to {cropDetails.temp_max}°C
                </p>
                <p className="mt-2 text-sm text-gray-600">{compatibility.humidityNote}</p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Soil and rain
                </p>
                <p className="mt-3 text-sm text-gray-700">
                  Soil types: {(cropDetails.soil_types || []).join(', ')}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  pH range: {cropDetails.pH_min} to {cropDetails.pH_max}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  Rainfall: {cropDetails.rainfall_min}-{cropDetails.rainfall_max} mm
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Recommended field strategy
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Droplets className="h-4 w-4 text-emerald-600" aria-hidden />
                      Irrigation guidance
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {cropDetails.irrigation_schedule}
                    </p>
                  </div>
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Thermometer className="h-4 w-4 text-emerald-600" aria-hidden />
                      Fertility guidance
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {cropDetails.fertilizer_plan}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-gray-600">Choose a crop to load agronomy guidance.</p>
          )}
        </div>
      </section>
    </div>
  )
}
