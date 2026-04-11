import { useState } from 'react'
import toast from 'react-hot-toast'
import { QrCode, Search } from 'lucide-react'
import api from '../api/axios'

export default function Traceability() {
  const [product, setProduct] = useState('')
  const [batch, setBatch] = useState('')
  const [farmer, setFarmer] = useState('')
  const [location, setLocation] = useState('')
  const [harvestDate, setHarvestDate] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(null)

  const [lookupId, setLookupId] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [record, setRecord] = useState(null)

  const createRecord = async (e) => {
    e.preventDefault()
    setCreating(true)
    setCreated(null)
    try {
      const { data } = await api.post('/trace/create', {
        product,
        batch_id: batch,
        farmer,
        location,
        harvest_date: harvestDate,
        notes,
      })
      setCreated(data)
      setRecord(data)
      setLookupId(data.id)
      toast.success(`Trace ID ${data.id} created`)
    } catch (err) {
      toast.error(err.userMessage || 'Could not create trace')
    } finally {
      setCreating(false)
    }
  }

  const fetchRecord = async (e) => {
    e.preventDefault()
    const id = lookupId.trim()
    if (!id) {
      toast.error('Enter a trace ID')
      return
    }
    setLookupLoading(true)
    setRecord(null)
    try {
      const { data } = await api.get(`/trace/${encodeURIComponent(id)}`)
      setRecord(data)
      toast.success('Record loaded')
    } catch (err) {
      toast.error(err.userMessage || 'Trace not found')
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <QrCode className="h-8 w-8 text-green-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">Create trace</h2>
            <p className="text-sm text-gray-500">Register a batch for supply-chain visibility.</p>
          </div>
        </div>
        <form onSubmit={createRecord} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Product / crop</label>
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Organic wheat"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Batch ID (optional)</label>
            <input
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Farmer / producer</label>
            <input
              value={farmer}
              onChange={(e) => setFarmer(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Harvest date</label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create trace record'}
          </button>
        </form>
        {created?.id && (
          <p className="mt-3 text-sm text-green-600">
            Share this ID: <span className="font-mono font-bold">{created.id}</span>
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="h-8 w-8 text-green-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">Lookup</h2>
            <p className="text-sm text-gray-500">Enter a trace ID to view chain events.</p>
          </div>
        </div>
        <form onSubmit={fetchRecord} className="mt-4 flex gap-2">
          <input
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3D4"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm uppercase focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {lookupLoading ? '…' : 'Lookup'}
          </button>
        </form>

        {record && (
          <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
            <h3 className="font-bold text-gray-800">{record.product}</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Trace ID</dt>
                <dd className="font-mono font-semibold text-gray-800">{record.id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Batch</dt>
                <dd className="text-gray-800">{record.batch}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Farmer</dt>
                <dd className="text-gray-800">{record.farmer}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Location</dt>
                <dd className="text-gray-800">{record.location}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Harvest</dt>
                <dd className="text-gray-800">{record.harvest_date}</dd>
              </div>
            </dl>
            {record.notes ? <p className="text-sm text-gray-600">{record.notes}</p> : null}
            {Array.isArray(record.chain) && record.chain.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Chain</p>
                <ul className="mt-2 space-y-2">
                  {record.chain.map((step, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                    >
                      <span className="font-medium text-gray-800">{step.step}</span>
                      <span className="text-gray-400"> · {step.at}</span>
                      {step.detail ? <p className="text-xs text-gray-500">{step.detail}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
