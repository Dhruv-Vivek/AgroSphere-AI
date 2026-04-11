import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Bot, ExternalLink, MessageCircle } from 'lucide-react'
import api from '../api/axios'
import { useMitraChat } from '../context/MitraChatContext'

const ALERT_KEY = 'agrosphere-scheme-alerts'

const FILTERS = ['All', 'Subsidies', 'Insurance', 'Loans', 'Training']

const CATEGORIES = ['General', 'SC', 'ST', 'OBC', 'Marginal']

function loadAlertSet() {
  try {
    const raw = localStorage.getItem(ALERT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function saveAlertSet(set) {
  localStorage.setItem(ALERT_KEY, JSON.stringify([...set]))
}

const SCHEME_CARD_IMAGE = {
  Subsidies:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Vegetable_bundle.jpg/320px-Vegetable_bundle.jpg',
  Insurance:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Wheat_P1210892.jpg/320px-Wheat_P1210892.jpg',
  Loans:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/White%2C_Brown%2C_Red_%26_Wild_rice.jpg/320px-White%2C_Brown%2C_Red_%26_Wild_rice.jpg',
  Training:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Bananas_white_background.jpg/320px-Bananas_white_background.jpg',
  default:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Farmer_in_Cambodia.jpg/400px-Farmer_in_Cambodia.jpg',
}

export default function GovtSchemes() {
  const { openMitra } = useMitraChat()
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  const [land, setLand] = useState('')
  const [income, setIncome] = useState('')
  const [category, setCategory] = useState('General')
  const [eligible, setEligible] = useState([])
  const [partial, setPartial] = useState([])
  const [checkLoading, setCheckLoading] = useState(false)

  const [alerts, setAlerts] = useState(() => loadAlertSet())

  const fetchSchemes = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/schemes')
      setSchemes(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e.userMessage || 'Could not load schemes')
      setSchemes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchemes()
  }, [fetchSchemes])

  const eligibleIds = useMemo(() => new Set((eligible || []).map((s) => s.id)), [eligible])

  const filteredSchemes = useMemo(() => {
    if (filter === 'All') return schemes
    return schemes.filter((s) => String(s.category || '') === filter)
  }, [schemes, filter])

  const submitEligibility = async (e) => {
    e.preventDefault()
    setCheckLoading(true)
    setEligible([])
    setPartial([])
    try {
      const { data } = await api.post('/schemes/check-eligibility', {
        land_acres: Number(land) || 0,
        income: Number(income) || 0,
        category,
      })
      setEligible(data.eligible || [])
      setPartial(data.partially_eligible || [])
      toast.success('Eligibility check complete')
    } catch (err) {
      toast.error(err.userMessage || 'Eligibility check failed')
    } finally {
      setCheckLoading(false)
    }
  }

  const toggleAlert = (id) => {
    setAlerts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveAlertSet(next)
      toast.success(next.has(id) ? 'We will remind you (demo)' : 'Alerts off for this scheme')
      return next
    })
  }

  const cardTone = (id) => {
    if (eligibleIds.has(id)) return 'ring-2 ring-green-500 border-green-200'
    return 'border-gray-100'
  }

  const buildEligiblePrompt = () => {
    const names = eligible.map((s) => s.name).join(', ')
    const acres = land || '—'
    const inc = income || '—'
    return `I used the AgroSphere eligibility checker. I am a ${category} farmer with ${acres} acres and annual income ₹${inc}. The app marked me as likely eligible for: ${names}. Please walk me through how to apply, starting with the easiest scheme first, and list documents I should keep ready.`
  }

  const buildPartialPrompt = () => {
    const names = partial.map((s) => s.name).join(', ')
    const acres = land || '—'
    const inc = income || '—'
    return `I used the eligibility checker. I am a ${category} farmer with ${acres} acres and income ₹${inc}. These schemes need more verification: ${names}. Explain what I should check on the official portal and which documents might strengthen my application.`
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3 rounded-xl border border-green-100 bg-gradient-to-r from-green-50 via-white to-emerald-50/50 p-4 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-md">
          <Bot className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-800">Applying for a scheme?</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Open <strong className="text-green-700">Mitra</strong> for help with documents, official portals, and
            CSC / bank steps. Mitra guides you only — always confirm on the official{' '}
            <span className="font-medium">.gov.in</span> site before you submit anything.
          </p>
          <button
            type="button"
            onClick={() => openMitra()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Open Mitra
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800">Eligibility checker</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter rough details — results are indicative; always verify on the official portal.
        </p>
        <form onSubmit={submitEligibility} className="mt-4 grid gap-4 md:grid-cols-4 md:items-end">
          <div>
            <label className="text-xs font-medium text-gray-500">Land (acres)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={land}
              onChange={(e) => setLand(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Annual income (INR)</label>
            <input
              type="number"
              min={0}
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Farmer category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={checkLoading}
            className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {checkLoading ? 'Checking…' : 'Check eligibility'}
          </button>
        </form>

        {(eligible.length > 0 || partial.length > 0) && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {eligible.length > 0 && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <p className="font-bold">Likely eligible</p>
                <ul className="mt-2 list-inside list-disc">
                  {eligible.map((s) => (
                    <li key={s.id}>{s.name}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => openMitra({ autoMessage: buildEligiblePrompt() })}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 sm:w-auto"
                >
                  <Bot className="h-4 w-4 shrink-0" aria-hidden />
                  Mitra AI — help me apply
                </button>
              </div>
            )}
            {partial.length > 0 && (
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
                <p className="font-bold">Partial / verify</p>
                <ul className="mt-2 list-inside list-disc">
                  {partial.map((s) => (
                    <li key={s.id}>{s.name}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => openMitra({ autoMessage: buildPartialPrompt() })}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-yellow-700 bg-white px-3 py-2.5 text-sm font-bold text-yellow-900 shadow-sm hover:bg-yellow-100 sm:w-auto"
                >
                  <Bot className="h-4 w-4 shrink-0" aria-hidden />
                  Ask Mitra about these
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === f ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading schemes…</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSchemes.map((s) => (
              <article
                key={s.id}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm ${cardTone(s.id)}`}
              >
                <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                  <img
                    src={SCHEME_CARD_IMAGE[s.category] || SCHEME_CARD_IMAGE.default}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-2 left-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-800">
                    {s.category}
                  </span>
                </div>
                <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{s.name}</h3>
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {s.ministry}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{s.benefit_amount}</p>
                </div>
                <p className="mt-3 text-sm text-gray-600">{s.description}</p>
                <p className="mt-2 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Eligibility: </span>
                  {s.eligibility_summary}
                </p>
                {Array.isArray(s.documents) && s.documents.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Documents: </span>
                    {s.documents.join(', ')}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={s.apply_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 min-w-[8rem]"
                  >
                    Apply Now
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => toggleAlert(s.id)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                      alerts.has(s.id)
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-green-600 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {alerts.has(s.id) ? 'Alert on' : 'Alert Me'}
                  </button>
                </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
