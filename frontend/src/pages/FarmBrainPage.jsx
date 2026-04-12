import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Brain, Loader2, MessageCircle, Play, RefreshCw, Sparkles } from 'lucide-react'
import api from '../api/axios'

export default function FarmBrainPage() {
  const farmId = 'demo'
  const [demoFarm, setDemoFarm] = useState(null)
  const [decision, setDecision] = useState(null)
  const [source, setSource] = useState(null)
  const [loadingFarm, setLoadingFarm] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [logs, setLogs] = useState([])
  const [question, setQuestion] = useState('')
  const [askBusy, setAskBusy] = useState(false)
  const [lastReply, setLastReply] = useState('')

  const loadDemo = useCallback(async () => {
    setLoadingFarm(true)
    try {
      const { data } = await api.get('/ai/demo-farm')
      if (data?.ok) setDemoFarm(data.data)
    } catch (e) {
      toast.error(e.userMessage || 'Could not load demo farm')
    } finally {
      setLoadingFarm(false)
    }
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const { data } = await api.get(`/ai/decisions/${farmId}`)
      if (data?.ok) setLogs(data.data || [])
    } catch {
      /* ignore */
    }
  }, [farmId])

  useEffect(() => {
    void loadDemo()
    void loadLogs()
  }, [loadDemo, loadLogs])

  const runAnalysis = async () => {
    setAnalyzing(true)
    setDecision(null)
    setSource(null)
    try {
      const { data } = await api.post(`/ai/analyze/${farmId}`, {
        farm: demoFarm || undefined,
      })
      if (!data?.ok) {
        toast.error(data?.error || 'Analysis failed')
        return
      }
      setDecision(data.data)
      setSource(data.source)
      if (data.message) toast(data.message, { icon: 'ℹ️' })
      void loadLogs()
    } catch (e) {
      toast.error(e.userMessage || 'Analysis request failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const ask = async () => {
    const q = question.trim()
    if (!q) return
    setAskBusy(true)
    setLastReply('')
    try {
      const { data } = await api.post(`/ai/ask/${farmId}`, { question: q })
      if (!data?.ok) {
        toast.error(data?.error || 'Ask failed')
        return
      }
      setLastReply(data.reply || '')
    } catch (e) {
      toast.error(e.userMessage || 'Ask failed')
    } finally {
      setAskBusy(false)
    }
  }

  const summary = decision?.farm_summary
  const zones = decision?.zones || {}

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-slate-100 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40">
              <Brain className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                Farm decision support
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">AI Brain</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                {source ? (
                  <>
                    Live analysis via{' '}
                    <span className="font-mono text-green-400">
                      {source === 'groq' ? 'Groq (llama-3.3-70b-versatile)' :
                       source === 'gemini' ? 'Gemini (gemini-2.0-flash-lite)' :
                       'Cached demo data'}
                    </span>
                    {' '}\u00b7 Demo farm: Sharma Farm \u2014 20 acres, four zones.
                  </>
                ) : (
                  <>Multi-zone AI analysis \u00b7 Demo farm: Sharma Farm \u2014 20 acres, four zones.</>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadDemo()}
              disabled={loadingFarm}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {loadingFarm ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reload farm
            </button>
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow hover:bg-emerald-400 disabled:opacity-60"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run analysis
            </button>
          </div>
        </div>
        {source && (
          <span className={`mt-4 inline-block text-xs px-2 py-0.5 rounded-full ${
            source === 'cached'
              ? 'bg-amber-900/40 text-amber-400'
              : 'bg-green-900/40 text-green-400'
          }`}>
            Last run: {source === 'cached' ? 'cached' : `live \u00b7 ${source}`}
          </span>
        )}
      </header>

      {loadingFarm ? (
        <div className="flex justify-center py-12 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : demoFarm ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Demo farm context</h2>
          <p className="mt-1 text-xs text-gray-500">
            {demoFarm.farm_name} · {demoFarm.total_acres} acres · borewell {demoFarm.borewell?.flow_rate_lpm}{' '}
            L/min
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
            {(demoFarm.zones || []).map((z) => (
              <li key={z.id} className="rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
                <span className="font-semibold">{z.label}</span> — {z.crop},{' '}
                <span className="text-gray-500">{z.acres} ac</span> · moisture {z.soil?.moisture_pct}%
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Overall health</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{summary.overall_health}%</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Critical alerts</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.critical_alerts_count}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Borewell</p>
            <p className="mt-1 text-lg font-bold capitalize text-sky-700">
              {summary.borewell_recommendation}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Water budget (wk)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summary.weekly_water_budget_kl} kL</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-xs font-semibold uppercase text-amber-900">Top priority</p>
            <p className="mt-1 text-sm font-medium text-amber-950">{summary.top_priority_action}</p>
          </div>
        </section>
      )}

      {Object.keys(zones).length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
            Zone decisions
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(zones).map(([id, z]) => (
              <article
                key={id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-gray-900/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900">Zone {id}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                      z.status === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : z.status === 'warning'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {z.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">Health {z.health_score}%</p>
                {z.irrigation?.reasoning && (
                  <p className="mt-2 text-xs text-gray-500">{z.irrigation.reasoning}</p>
                )}
                {Array.isArray(z.care_tasks) && z.care_tasks.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {z.care_tasks.map((task, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">›</span>
                        <span>
                          <span className={`font-semibold ${task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-amber-600' : 'text-gray-500'}`}>{task.priority}</span>
                          {' '}{task.description}
                          {task.quantity && <span className="text-gray-400"> ({task.quantity})</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {z.yield_forecast && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
                    <span>Yield: <span className="text-gray-800">{z.yield_forecast.expected_kg_per_acre} kg/ac</span></span>
                    <span>Confidence: <span className="text-gray-800">{Math.round((z.yield_forecast.confidence ?? 0) * 100)}%</span></span>
                  </div>
                )}
                {z.growth_stage_assessment && (
                  <p className="mt-1 text-xs text-gray-400 italic">{z.growth_stage_assessment}</p>
                )}
                {Array.isArray(z.alerts) && z.alerts.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-red-700">
                    {z.alerts.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden />
          Ask the brain
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Uses Groq <code className="rounded bg-gray-100 px-1">llama-3.1-8b-instant</code> when configured;
          otherwise Gemini answers from your farm summary (run analysis first for best context).
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which zone needs water most urgently?"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            onKeyDown={(e) => e.key === 'Enter' && void ask()}
          />
          <button
            type="button"
            onClick={() => void ask()}
            disabled={askBusy || !question.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {askBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Ask'}
          </button>
        </div>
        {lastReply && (
          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-800">{lastReply}</p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900">Decision log</h2>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Refresh
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No runs yet — use Run analysis.</p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {logs.map((e, i) => (
              <li key={i} className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                <span className="font-mono text-xs text-gray-400">{e.at}</span>
                <span className="ml-2 text-xs font-semibold text-emerald-700">{e.source}</span>
                <p className="mt-1 text-gray-800">{e.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}