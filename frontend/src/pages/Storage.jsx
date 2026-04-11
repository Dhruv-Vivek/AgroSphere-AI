import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Star, Warehouse } from 'lucide-react'
import api from '../api/axios'
import CropImagePicker from '../components/CropImagePicker'

const TABS = ['Find Storage', 'Shelf Life', 'Marketplace', 'List Surplus']

const STORAGE_TYPES = [
  { value: 'room temp', label: 'Room temperature' },
  { value: 'cold storage', label: 'Cold storage' },
  { value: 'refrigerated', label: 'Refrigerated' },
]

const MOCK_LISTINGS = [
  {
    id: 'mock-1',
    crop: 'Maize',
    quantity_kg: 1200,
    price_per_kg: 16,
    farmer_name: 'Demo Farmer',
    location: 'Indore, MP',
    expires_at: '2026-04-25',
    contact: '+91 90000 00000',
  },
]

function Stars({ rating }) {
  const full = Math.floor(rating)
  return (
    <span className="flex items-center gap-0.5 text-yellow-500" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < full ? 'fill-current' : 'text-gray-200'}`} />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
    </span>
  )
}

function trafficColor(days) {
  if (days <= 3) return 'bg-red-500'
  if (days <= 7) return 'bg-yellow-500'
  return 'bg-green-500'
}

export default function Storage() {
  const [tab, setTab] = useState(0)
  const [centers, setCenters] = useState([])
  const [loadingCenters, setLoadingCenters] = useState(true)
  const [searchState, setSearchState] = useState('')
  const [searchCrop, setSearchCrop] = useState('')

  const [sfCrop, setSfCrop] = useState('Tomato')
  const [sfOtherName, setSfOtherName] = useState('')
  const [sfQty, setSfQty] = useState('')
  const [sfStorage, setSfStorage] = useState('cold storage')
  const [sfResult, setSfResult] = useState(null)
  const [sfLoading, setSfLoading] = useState(false)

  const [listings, setListings] = useState([])
  const [listLoading, setListLoading] = useState(true)

  const [formCrop, setFormCrop] = useState('Tomato')
  const [formCropCustom, setFormCropCustom] = useState('')
  const [formQty, setFormQty] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formContact, setFormContact] = useState('')
  const [listSubmitting, setListSubmitting] = useState(false)

  const loadCenters = useCallback(async () => {
    setLoadingCenters(true)
    try {
      const { data } = await api.get('/storage/centers', {
        params: {
          state: searchState || undefined,
          crop: searchCrop || undefined,
        },
      })
      setCenters(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Could not load storage centers')
      setCenters([])
    } finally {
      setLoadingCenters(false)
    }
  }, [searchState, searchCrop])

  const loadMarketplace = useCallback(async () => {
    setListLoading(true)
    try {
      const { data } = await api.get('/storage/marketplace')
      setListings(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Marketplace API failed — showing demo listings')
      setListings(MOCK_LISTINGS)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 0) loadCenters()
  }, [tab, loadCenters])

  useEffect(() => {
    if (tab === 2) loadMarketplace()
  }, [tab, loadMarketplace])

  const filteredCenters = useMemo(() => centers, [centers])

  const submitShelfLife = async (e) => {
    e.preventDefault()
    setSfLoading(true)
    setSfResult(null)
    try {
      const cropForApi = sfCrop === 'Other' ? sfOtherName.trim() || 'Other' : sfCrop
      const { data } = await api.post('/storage/shelf-life', {
        crop: cropForApi,
        quantity: Number(sfQty) || 0,
        current_storage: sfStorage,
      })
      setSfResult(data)
      toast.success('Shelf life estimated')
    } catch (err) {
      toast.error(err.userMessage || 'Shelf life request failed')
    } finally {
      setSfLoading(false)
    }
  }

  const submitListing = async (e) => {
    e.preventDefault()
    const cropName = formCrop === 'Other' ? formCropCustom.trim() : formCrop
    if (!cropName) {
      toast.error('Choose a crop or enter a name under Other')
      return
    }
    setListSubmitting(true)
    try {
      await api.post('/storage/list', {
        crop: cropName,
        quantity: formQty,
        price: formPrice,
        description: formDesc,
        contact: formContact,
      })
      toast.success('Listing created')
      setFormCrop('Tomato')
      setFormCropCustom('')
      setFormQty('')
      setFormPrice('')
      setFormDesc('')
      setFormContact('')
      loadMarketplace()
    } catch (err) {
      toast.error(err.userMessage || 'Could not create listing')
    } finally {
      setListSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(i)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === i
                ? 'bg-green-600 text-white'
                : 'border border-green-600 text-green-600 hover:bg-green-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500">Filter by state</label>
                <input
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500">Filter by crop</label>
                <input
                  value={searchCrop}
                  onChange={(e) => setSearchCrop(e.target.value)}
                  placeholder="e.g. tomato"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>
              <button
                type="button"
                onClick={loadCenters}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Search
              </button>
            </div>
          </div>

          {loadingCenters ? (
            <p className="text-gray-500">Loading centers…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCenters.map((c) => {
                const used = c.capacity_used_pct ?? 0
                const avail = Math.max(0, 100 - used)
                return (
                  <article
                    key={c.id}
                    className="flex flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-gray-800">{c.name}</h3>
                        <p className="text-sm text-gray-500">
                          {c.city}, {c.state}
                        </p>
                      </div>
                      <Warehouse className="h-8 w-8 shrink-0 text-green-600" aria-hidden />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Crops:{' '}
                      {Array.isArray(c.crops)
                        ? c.crops.map((x) => String(x).replace(/_/g, ' ')).join(', ')
                        : '—'}
                    </p>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>Available capacity</span>
                        <span>{avail}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${avail}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-gray-800">
                        <span className="text-gray-500">₹</span>
                        <span className="font-semibold">{c.price_per_day}</span>
                        <span className="text-gray-500"> / day</span>
                      </span>
                      <Stars rating={c.rating ?? 0} />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Temp: {c.temp_min_c}°C – {c.temp_max_c}°C
                    </p>
                    <button
                      type="button"
                      onClick={() => toast.success('Booking flow — demo')}
                      className="mt-4 w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Book Now
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={submitShelfLife}
            className="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold text-gray-800">Shelf life predictor</h3>
            <CropImagePicker value={sfCrop} onChange={setSfCrop} label="Select produce" />
            {sfCrop === 'Other' && (
              <div>
                <label className="text-xs font-medium text-gray-500">Specify crop name</label>
                <input
                  value={sfOtherName}
                  onChange={(e) => setSfOtherName(e.target.value)}
                  placeholder="e.g. Maize, Coconut, Chillies"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500">Quantity (kg)</label>
              <input
                type="number"
                min={0}
                value={sfQty}
                onChange={(e) => setSfQty(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Current storage</label>
              <select
                value={sfStorage}
                onChange={(e) => setSfStorage(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {STORAGE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={sfLoading}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {sfLoading ? 'Estimating…' : 'Estimate shelf life'}
            </button>
          </form>

          {sfResult && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800">Result</h3>
              <div className="mt-4 flex items-center gap-4">
                <p className="text-5xl font-bold text-gray-800">{sfResult.days_remaining}</p>
                <div>
                  <p className="text-sm text-gray-500">days remaining (estimate)</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-block h-4 w-4 rounded-full ${trafficColor(sfResult.days_remaining)}`} />
                    <span className="text-sm capitalize text-gray-600">{sfResult.action}</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-700">{sfResult.recommendation}</p>
            </div>
          )}
        </div>
      )}

      {tab === 2 && (
        <div>
          {listLoading ? (
            <p className="text-gray-500">Loading marketplace…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((row) => (
                <article
                  key={row.id}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <h3 className="text-lg font-bold text-gray-800">{row.crop}</h3>
                  <p className="text-sm text-gray-500">
                    {row.quantity_kg} kg · ₹{row.price_per_kg}/kg
                  </p>
                  <p className="mt-2 text-sm text-gray-700">{row.farmer_name}</p>
                  <p className="text-xs text-gray-500">{row.location}</p>
                  <p className="mt-2 text-xs text-gray-500">Expiry: {row.expires_at}</p>
                  <button
                    type="button"
                    onClick={() => toast.success(`Contact: ${row.contact}`)}
                    className="mt-4 w-full rounded-lg border border-green-600 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                  >
                    Contact Farmer
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 3 && (
        <form
          onSubmit={submitListing}
          className="mx-auto max-w-lg space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-800">List surplus</h3>
          <CropImagePicker value={formCrop} onChange={setFormCrop} label="Produce" />
          {formCrop === 'Other' && (
            <div>
              <label className="text-xs font-medium text-gray-500">Crop name</label>
              <input
                value={formCropCustom}
                onChange={(e) => setFormCropCustom(e.target.value)}
                placeholder="What are you listing?"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500">Quantity (kg)</label>
            <input
              required
              type="number"
              min={1}
              value={formQty}
              onChange={(e) => setFormQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Price (₹ per kg)</label>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Contact</label>
            <input
              value={formContact}
              onChange={(e) => setFormContact(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={listSubmitting}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {listSubmitting ? 'Submitting…' : 'Publish listing'}
          </button>
        </form>
      )}
    </div>
  )
}
