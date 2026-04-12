import { useCallback, useRef, useState, useEffect } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FlaskConical,
  Leaf,
  Loader2,
  ScanLine,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'

// Using Plant.id API for real disease detection (configure VITE_PLANT_ID_API_KEY in .env).

const PLANT_ID_HEALTH_URL = 'https://api.plant.id/v2/health_assessment'

/** When Plant.id `disease_details` omits text, fill from this table (key = lowercase substring match on disease name). */
const TREATMENT_DB = {
  __default: {
    description:
      'No clinical description was returned. Compare your specimen with trusted extension guides or consult a plant pathologist for confirmation.',
    treatment:
      '🌿 Biological: Not specified in API response — use labeled biocontrols per local extension.\n🧪 Chemical: Not specified — follow label and pre-harvest intervals for your crop.\n🛡️ Prevention: Remove infected debris, improve airflow, avoid prolonged leaf wetness, and rotate hosts where applicable.',
  },
  blight: {
    description:
      'Late blight and related blights spread rapidly under cool, humid conditions; lesions often appear water-soaked and expand quickly.',
    treatment:
      '🌿 Biological: Bacillus-based products where labeled for your crop.\n🧪 Chemical: Protectant fungicides (e.g. mancozeb) per label; add systemic where resistance management allows.\n🛡️ Prevention: Destroy cull piles, ventilate tunnels/greenhouses, and irrigate at soil level.',
  },
  rust: {
    description:
      'Rust fungi produce orange to brown pustules on leaves; spores spread by wind and splashing water.',
    treatment:
      '🌿 Biological: Sulfur or approved biologicals if compatible with your crop stage.\n🧪 Chemical: Triazole/strobilurin programs per local resistance guidelines.\n🛡️ Prevention: Avoid overhead irrigation; remove heavily infected leaves early in the season.',
  },
  mildew: {
    description:
      'Powdery mildew shows white talcum-like growth on leaves; favored by warm days and cool nights with poor airflow.',
    treatment:
      '🌿 Biological: Potassium bicarbonate or registered biofungicides per label.\n🧪 Chemical: Sulfur, horticultural oils, or systemic DMIs where permitted.\n🛡️ Prevention: Increase spacing and prune for air movement; avoid excess nitrogen.',
  },
}

function treatmentDbEntryForName(diseaseName) {
  const n = (diseaseName || '').toLowerCase()
  const key = Object.keys(TREATMENT_DB).find((k) => k !== '__default' && n.includes(k))
  return TREATMENT_DB[key] || TREATMENT_DB.__default
}

/** Plant.id returns `treatment` as { biological, chemical, prevention } string arrays. */
function formatTreatmentFromApi(treatment) {
  if (!treatment || typeof treatment !== 'object') return ''
  const parts = []
  const bio = treatment.biological
  const chem = treatment.chemical
  const prev = treatment.prevention
  if (Array.isArray(bio) && bio.length) {
    parts.push(`🌿 Biological: ${bio.map(String).join(', ')}`)
  }
  if (Array.isArray(chem) && chem.length) {
    parts.push(`🧪 Chemical: ${chem.map(String).join(', ')}`)
  }
  if (Array.isArray(prev) && prev.length) {
    parts.push(`🛡️ Prevention: ${prev.map(String).join(', ')}`)
  }
  return parts.join('\n')
}

function normalizeCommonNames(raw) {
  if (!Array.isArray(raw) || !raw.length) return []
  return raw.map((x) => (typeof x === 'string' ? x : x?.name || String(x))).filter(Boolean)
}

const ACCEPT_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const ACCEPT_EXT = /\.(jpe?g|png)$/i

function isAcceptedImage(file) {
  if (!file) return false
  if (ACCEPT_TYPES.includes(file.type)) return true
  return ACCEPT_EXT.test(file.name || '')
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string') {
        reject(new Error('Invalid file read result'))
        return
      }
      const base64 = dataUrl.split(',')[1]
      if (!base64) reject(new Error('Could not extract base64 payload'))
      else resolve(base64)
    }
    reader.onerror = () => reject(reader.error || new Error('File read failed'))
  })
}

/** Map API / mock item into a single result shape. */
function normalizeResult(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = raw.name || raw.disease || raw.label || 'Unknown condition'
  const confidence = Number(raw.confidence ?? raw.score ?? 0)
  const description =
    raw.description || raw.details || 'No clinical description provided.'
  const treatment =
    raw.treatment || raw.recommendation || 'Consult an agronomist for treatment planning.'
  const severity = (raw.severity || 'Medium').toString()
  const affected_crops = Array.isArray(raw.affected_crops)
    ? raw.affected_crops
    : Array.isArray(raw.crops)
      ? raw.crops
      : []
  return {
    name,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    description,
    treatment,
    severity,
    affected_crops,
  }
}

function makeOfflineDiagnosis() {
  const candidate = [
    {
      name: 'Rust',
      severity: 'Medium',
      confidence: 72,
      description:
        'Typical leaf rust signs include small, powdery pustules on the undersides of leaves and yellow halos on the upper surface.',
      treatment: `🌿 Biological: Use sulfur-based biocontrols where labeled for your crop.
🧪 Chemical: Apply fungicides with rust activity, rotating modes of action.
🛡️ Prevention: Improve airflow and avoid wet foliage.`,
      affected_crops: ['Wheat', 'Barley', 'Soybean'],
    },
    {
      name: 'Powdery Mildew',
      severity: 'Medium',
      confidence: 68,
      description:
        'White powdery fungal growth on leaf surfaces. Common in humid, low-airflow conditions.',
      treatment: `🌿 Biological: Potassium bicarbonate sprays.
🧪 Chemical: Apply registered sulfur or DMI fungicides.
🛡️ Prevention: Increase spacing and airflow.`,
      affected_crops: ['Grapevine', 'Cucumber', 'Tomato'],
    },
    {
      name: 'Early Blight',
      severity: 'High',
      confidence: 81,
      description:
        'Concentric brown lesions on leaves and stems, often with a target-like pattern, consistent with early blight.',
      treatment: `🌿 Biological: Use compost teas and Bacillus-based sprays.
🧪 Chemical: Apply strobilurin or DMI fungicides as labeled.
🛡️ Prevention: Rotate crops and remove infected debris.`,
      affected_crops: ['Tomato', 'Potato'],
    },
  ]
  const index = Math.floor(Math.random() * candidate.length)
  return normalizeResult(candidate[index])
}

function confidenceBarClass(pct) {
  if (pct > 80) return 'bg-red-500'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-emerald-500'
}

function severityBadgeClass(sev) {
  const s = (sev || '').toLowerCase()
  if (s === 'high')
    return 'bg-red-50 text-red-800 ring-1 ring-red-200 border border-red-100'
  if (s === 'low')
    return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 border border-emerald-100'
  return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200 border border-amber-100'
}

/**
 * AI Disease Detection — leaf upload, Plant.id health assessment, diagnostic-style UI.
 */
const ANIMATIONS = `
  @keyframes pulse-border {
    0%, 100% {
      border-color: rgb(203 213 225);
      opacity: 1;
    }
    50% {
      border-color: rgb(16 185 129);
      opacity: 0.8;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  @keyframes scan-line {
    0%, 100% {
      transform: translateY(-100%);
    }
    50% {
      transform: translateY(100%);
    }
  }
  
  @keyframes celebrate {
    0% {
      transform: scale(0) rotate(0deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(180deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(360deg);
      opacity: 1;
    }
  }
  
  @keyframes slide-up {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes stagger-fade {
    from {
      transform: translateX(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-pulse-border {
    animation: pulse-border 3s ease-in-out infinite;
  }
  
  .shimmer {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }
  
  .scan-line {
    animation: scan-line 2s ease-in-out infinite;
  }
  
  .celebrate {
    animation: celebrate 0.6s ease-out;
  }
  
  .slide-up {
    animation: slide-up 0.5s ease-out;
  }
  
  .stagger-fade {
    animation: stagger-fade 0.4s ease-out;
  }
  
  .animate-fade-in {
    animation: fade-in 0.5s ease-out;
  }
`

export default function DiseaseDetection() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [result, setResult] = useState(null)
  const [healthy, setHealthy] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  const resetPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const pickFile = useCallback(
    (f) => {
      if (!isAcceptedImage(f)) {
        setErrorMsg('Please upload a JPG or PNG image of the leaf.')
        return
      }
      setErrorMsg(null)
      resetPreview()
      setFile(f)
      setPreviewUrl(URL.createObjectURL(f))
      setResult(null)
      setHealthy(false)
      setUsedFallback(false)
    },
    [resetPreview]
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    pickFile(f)
  }

  const onBrowse = (e) => {
    const f = e.target.files?.[0]
    pickFile(f)
    e.target.value = ''
  }

  const clearAll = () => {
    resetPreview()
    setFile(null)
    setPreviewUrl(null)
    setResult(null)
    setHealthy(false)
    setLoading(false)
    setErrorMsg(null)
    setUsedFallback(false)
  }

  function cleanTreatment(rawTreatment) {
    if (!rawTreatment || typeof rawTreatment !== 'object') return null

    const REMOVE_PHRASES = [
      'wash hands', 'wash your hands', 'household trash',
      'do not compost', 'clean and disinfect tools', 'disinfect tools',
      'avoid overcrowding', 'staking or trellising', 'row covers',
      'rain shelters', 'refrigerate', 'harvest promptly',
      'mummified fruit', 'pollinators', 'full bloom',
      'pots between', 'stakes and pots', 'quarantine and inspect'
    ]

    function filterItems(arr) {
      if (!Array.isArray(arr)) return []
      return arr
        .filter(item => !REMOVE_PHRASES.some(p => item.toLowerCase().includes(p)))
        .slice(0, 3)
        .map(item => item.length > 120 ? item.slice(0, 120).replace(/\s\S+$/, '') + '.' : item)
    }

    const parts = []
    const bio = filterItems(rawTreatment.biological)
    const chem = filterItems(rawTreatment.chemical)
    const prev = filterItems(rawTreatment.prevention)

    if (bio.length) parts.push('🌿 Biological:\n' + bio.map(i => `• ${i}`).join('\n'))
    if (chem.length) parts.push('🧪 Chemical:\n' + chem.map(i => `• ${i}`).join('\n'))
    if (prev.length) parts.push('🛡️ Prevention:\n' + prev.map(i => `• ${i}`).join('\n'))

    return parts.join('\n\n') || null
  }

  const analyze = async () => {
    if (!file) {
      setErrorMsg('Attach a leaf image before running analysis.')
      return
    }

    const apiKey = import.meta.env.VITE_PLANT_ID_API_KEY?.trim()
    if (!apiKey) {
      setErrorMsg(null)
      setUsedFallback(true)
      setLoading(true)
      setResult(null)
      setHealthy(false)

      // Simulate a local offline diagnosis when no API key is configured.
      window.setTimeout(() => {
        setResult(makeOfflineDiagnosis())
        setLoading(false)
      }, 750)
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setResult(null)
    setHealthy(false)
    setUsedFallback(false)

    try {
      const base64Image = await fileToBase64(file)

      const response = await fetch(PLANT_ID_HEALTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey,
        },
        body: JSON.stringify({
          images: [base64Image],
          modifiers: ['similar_images'],
          disease_details: ['description', 'treatment', 'common_names', 'cause'],
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const detail =
          data?.message ||
          data?.error ||
          (Array.isArray(data?.suggestions) ? data.suggestions.join(' ') : null) ||
          `HTTP ${response.status}`
        setErrorMsg(`Plant.id request failed: ${detail}. Please try again with a clear image.`)
        return
      }

      const health = data.health_assessment
      if (!health || typeof health !== 'object') {
        setErrorMsg('Unexpected response from Plant.id. Please try again with a clear image.')
        return
      }

      if (health.is_healthy === true || health.is_healthy === 'true') {
        setHealthy(true)
        setResult(null)
        return
      }

      const disease = health.diseases?.[0]
      if (!disease) {
        setHealthy(true)
        setResult(null)
        return
      }

      const prob =
        typeof disease.probability === 'number'
          ? disease.probability
          : Number(disease.probability) || 0
      const confidencePct = prob <= 1 ? prob * 100 : prob

      const details = disease.disease_details || {}
      const diseaseName = disease.name || 'Unknown disease'
      const fb = treatmentDbEntryForName(diseaseName)

      let description = (details.description || '').trim()
      if (!description && details.cause) {
        description = String(details.cause).trim()
      }
      if (!description) {
        description = fb.description
      }

      const rawTreatment = disease.disease_details?.treatment
      const cleaned = cleanTreatment(rawTreatment)
      const treatment = cleaned || fb.treatment

      const affected_crops = normalizeCommonNames(details.common_names)

      const resultObj = {
        name: diseaseName,
        confidence: confidencePct,
        description,
        treatment,
        severity: disease.severity || 'Medium',
        affected_crops,
      }

      setHealthy(false)
      setResult(normalizeResult(resultObj))
    } catch (err) {
      console.warn('[DiseaseDetection] Plant.id error:', err)
      setErrorMsg('API failed. Please try again with a clear image.')
      setHealthy(false)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const loadingMessages = [
    "Scanning leaf morphology...",
    "Comparing against 90+ diseases...",
    "Generating diagnosis report..."
  ]

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [loading])

  const pct = result ? Math.min(100, Math.max(0, result.confidence)) : 0

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 relative">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/20"></div>

        <div className="p-4 md:p-8">
          <header className="mb-8 border-b border-slate-200/60 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                  Pathology Lab
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Disease Detection
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Specimen imaging and AI-assisted differential diagnosis. Upload a clear leaf
                  sample for automated screening and treatment planning support.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3 text-right shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Endpoint
                </p>
                <p className="font-mono text-xs text-emerald-800">POST /api/disease/detect</p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-12 xl:gap-8">
            {/* Specimen intake */}
            <section className="lg:col-span-5 xl:col-span-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors duration-200 hover:text-slate-700">
                  Specimen intake
                </span>
                {file && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Clear
                  </button>
                )}
              </div>

              {!file && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      inputRef.current?.click()
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={[
                    'group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white p-8 text-center transition-all duration-300 ease-out',
                    dragOver
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-500/25 scale-[1.02]'
                      : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 hover:shadow-md hover:scale-[1.01]',
                    'animate-pulse-border'
                  ].join(' ')}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    className="hidden"
                    onChange={onBrowse}
                  />
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50">
                    <Upload className="h-7 w-7" aria-hidden />
                  </div>
                  <p className="text-base font-semibold text-slate-800">
                    Drop leaf image here
                  </p>
                  <p className="mt-1 text-sm text-slate-500">or click to browse - JPG / PNG</p>
                  <p className="mt-4 font-mono text-[11px] text-slate-400 transition-colors duration-200 hover:text-slate-600">
                    Max clarity: natural light, in-focus lesion area
                  </p>
                </div>
              )}

              {previewUrl && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Preview
                    </span>
                    <Leaf className="h-4 w-4 text-emerald-600" aria-hidden />
                  </div>
                  <div className="relative bg-slate-900/5 p-4">
                    <img
                      src={previewUrl}
                      alt="Leaf specimen preview"
                      className="mx-auto max-h-56 w-auto max-w-full rounded-lg object-contain shadow-inner ring-1 ring-slate-200"
                    />
                    {file && (
                      <div className="mt-3 text-center">
                        <p className="text-xs font-medium text-slate-700">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={!file || loading}
                onClick={analyze}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all duration-300 hover:bg-emerald-700 hover:shadow-emerald-700/30 disabled:cursor-not-allowed disabled:bg-emerald-500 disabled:shadow-emerald-500/25 disabled:opacity-80 relative overflow-hidden ${file && !loading ? 'shimmer' : ''
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <ScanLine className="h-5 w-5" aria-hidden />
                    Analyze Disease
                  </>
                )}
              </button>

              {errorMsg && (
                <p
                  className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {errorMsg}
                </p>
              )}
            </section>

            {/* Analysis output */}
            <section className="lg:col-span-7 xl:col-span-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors duration-200 hover:text-slate-700">
                  Analysis output
                </span>
                {usedFallback && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                    Offline diagnostic (mock)
                  </span>
                )}
              </div>

              <div className="min-h-[420px] rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading && (
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-6 p-8">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-100 overflow-hidden">
                      <Leaf className="h-12 w-12 text-emerald-600 z-10" aria-hidden />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400 to-transparent opacity-30 scan-line"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-400 opacity-60 animate-pulse"></div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold text-slate-800">AI analyzing leaf…</p>
                      <p className="max-w-sm text-sm text-slate-500 transition-all duration-500">
                        {loadingMessages[loadingMessageIndex]}
                      </p>
                      <div className="flex justify-center gap-1 mt-3">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full bg-emerald-400 transition-all duration-300 ${i === loadingMessageIndex ? 'opacity-100 scale-125' : 'opacity-30 scale-100'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!loading && healthy && (
                  <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 p-10 text-center relative bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50/30">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-600 ring-8 ring-emerald-50 shadow-lg celebrate">
                      <CheckCircle2 className="h-14 w-14" aria-hidden />
                    </div>
                    <div className="space-y-3 slide-up">
                      <h3 className="text-3xl font-bold text-emerald-800">Healthy Plant!</h3>
                      <p className="max-w-md text-sm leading-relaxed text-slate-600">
                        No significant pathology markers detected in this specimen. Continue
                        routine monitoring and maintain cultural practices.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-900 transition-all duration-200 hover:bg-emerald-100 hover:shadow-md hover:scale-105"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                      Scan Another
                    </button>
                  </div>
                )}

                {!loading && !healthy && result && (
                  <div className={`slide-up border-l-4 ${result.severity === 'high' ? 'border-l-red-500' :
                    result.severity === 'low' ? 'border-l-emerald-500' :
                      'border-l-amber-500'
                    } bg-white shadow-lg rounded-xl overflow-hidden`}>
                    <div className="space-y-0 divide-y divide-slate-100 p-6 md:p-8">
                      <div className="pb-6">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Primary diagnosis
                        </p>
                        <h3 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl animate-fade-in">
                          {result.name}
                        </h3>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase transition-all duration-200 hover:scale-105 ${severityBadgeClass(result.severity)}`}
                          >
                            Severity: {result.severity}
                          </span>
                          {result.affected_crops?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-slate-500">
                                Affected crops
                              </span>
                              {result.affected_crops.map((c, i) => (
                                <span
                                  key={c}
                                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition-all duration-200 hover:bg-slate-200 hover:scale-105 stagger-fade"
                                  style={{ animationDelay: `${i * 100}ms` }}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="py-6">
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Model confidence
                          </p>
                          <p className="font-mono text-sm font-bold text-slate-800">
                            {pct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-600 ${confidenceBarClass(pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Bar color: high certainty (&gt;80%) red · moderate 50–80% amber · below
                          50% green.
                        </p>
                      </div>

                      <div className="py-6 stagger-fade" style={{ animationDelay: '200ms' }}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Clinical description
                        </p>
                        <p className="text-sm leading-relaxed text-slate-700 transition-all duration-200 hover:text-slate-900">{result.description}</p>
                      </div>

                      <div className="pt-6 stagger-fade" style={{ animationDelay: '300ms' }}>
                        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                          <Droplets className="h-3.5 w-3.5" aria-hidden />
                          Treatment recommendations
                        </p>
                        <div className="whitespace-pre-line rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 text-sm leading-relaxed text-emerald-950 ring-1 ring-emerald-100 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md">
                          {result.treatment}
                        </div>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 md:w-auto md:px-6"
                        >
                          Scan Another
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!loading && !healthy && !result && (
                  <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center text-slate-500">
                    <ScanLine className="h-10 w-10 text-slate-300" aria-hidden />
                    <p className="max-w-xs text-sm">
                      Awaiting specimen. Upload a leaf image and run analysis to populate the
                      diagnostic report.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
console.log("HELLO TEST");