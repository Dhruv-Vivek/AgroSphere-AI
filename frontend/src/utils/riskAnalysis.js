/**
 * Deterministic geopolitical / trade risk signals derived from news text.
 * Keyword lists are explicit and stable for auditability.
 */

/** Immediate escalation keywords */
export const HIGH_SEVERITY_KEYWORDS = ['war', 'conflict']

/** Elevated trade disruption keywords */
export const MEDIUM_SEVERITY_KEYWORDS = ['sanctions', 'export ban', 'port closure']

/** Used to associate free-text with a geography when the API omits structured country fields */
export const KNOWN_COUNTRY_ALIASES = [
  { match: /\bunited states\b|\busa\b|\bu\.s\.a\.\b|\bu\.s\.\b/gi, label: 'United States' },
  { match: /\bunited kingdom\b|\buk\b|\bbritain\b|\bengland\b/gi, label: 'United Kingdom' },
  { match: /\beuropean union\b|\beu\b/gi, label: 'European Union' },
  { match: /\bindia\b/gi, label: 'India' },
  { match: /\bchina\b/gi, label: 'China' },
  { match: /\brussia\b/gi, label: 'Russia' },
  { match: /\bukraine\b/gi, label: 'Ukraine' },
  { match: /\bbrazil\b/gi, label: 'Brazil' },
  { match: /\bcanada\b/gi, label: 'Canada' },
  { match: /\baustralia\b/gi, label: 'Australia' },
  { match: /\bsaudi arabia\b/gi, label: 'Saudi Arabia' },
  { match: /\biran\b/gi, label: 'Iran' },
  { match: /\bisrael\b/gi, label: 'Israel' },
  { match: /\bturkey\b|\btürkiye\b/gi, label: 'Turkey' },
  { match: /\bpakistan\b/gi, label: 'Pakistan' },
  { match: /\bbangladesh\b/gi, label: 'Bangladesh' },
  { match: /\bindonesia\b/gi, label: 'Indonesia' },
  { match: /\bvietnam\b/gi, label: 'Vietnam' },
  { match: /\bargentina\b/gi, label: 'Argentina' },
  { match: /\bmexico\b/gi, label: 'Mexico' },
  { match: /\bnigeria\b/gi, label: 'Nigeria' },
  { match: /\bsouth africa\b/gi, label: 'South Africa' },
]

/** @typedef {'LOW'|'MEDIUM'|'HIGH'} RiskLevel */

/**
 * Collapse ordered severities: HIGH beats MEDIUM beats LOW.
 * @param {RiskLevel} a
 * @param {RiskLevel} b
 * @returns {RiskLevel}
 */
export function maxRisk(a, b) {
  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 }
  return rank[a] >= rank[b] ? a : b
}

/**
 * @param {string} text
 * @returns {{ keyword: string, level: RiskLevel }[]}
 */
export function extractKeywordSignals(text) {
  const lower = (text || '').toLowerCase()
  const hits = []
  for (const keyword of HIGH_SEVERITY_KEYWORDS) {
    if (lower.includes(keyword)) hits.push({ keyword, level: 'HIGH' })
  }
  for (const keyword of MEDIUM_SEVERITY_KEYWORDS) {
    if (lower.includes(keyword)) hits.push({ keyword, level: 'MEDIUM' })
  }
  return hits
}

/**
 * Infer countries mentioned in text using alias regex (deterministic).
 * @param {string} text
 * @returns {string[]}
 */
export function inferCountriesFromText(text) {
  const t = text || ''
  const found = new Set()
  for (const { match, label } of KNOWN_COUNTRY_ALIASES) {
    match.lastIndex = 0
    if (match.test(t)) found.add(label)
  }
  return [...found]
}

/**
 * Normalize a single news record into plain fields.
 * @param {unknown} raw
 * @param {number} index
 */
function normalizeArticle(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (raw)
  const title = String(r.title ?? r.headline ?? '')
  const body = String(
    r.description ?? r.summary ?? r.content ?? r.body ?? r.text ?? '',
  )
  const countryField = r.country ?? r.region ?? r.location
  const structuredCountries = []
  if (typeof countryField === 'string' && countryField.trim()) {
    structuredCountries.push(countryField.trim())
  }
  if (Array.isArray(r.countries)) {
    for (const c of r.countries) {
      if (typeof c === 'string' && c.trim()) structuredCountries.push(c.trim())
    }
  }
  const textBlob = `${title} ${body}`
  const inferred = inferCountriesFromText(textBlob)
  const countries = [...new Set([...structuredCountries, ...inferred])]
  const id =
    (typeof r.id === 'string' || typeof r.id === 'number' ? String(r.id) : null) ??
    `article-${index}`
  return { id, title, body: body || title, countries, textBlob }
}

/**
 * Risk for one article: keyword severity maxed across hits; scoped to listed countries or Global.
 * @param {ReturnType<typeof normalizeArticle>} article
 * @returns {{ countries: string[], level: RiskLevel, signals: {keyword: string, level: RiskLevel}[] }}
 */
export function riskForArticle(article) {
  if (!article) {
    return { countries: ['Global'], level: 'LOW', signals: [] }
  }
  const signals = extractKeywordSignals(article.textBlob)
  let level = /** @type {RiskLevel} */ ('LOW')
  for (const s of signals) level = maxRisk(level, s.level)
  const countries = article.countries.length ? article.countries : ['Global']
  return { countries, level, signals }
}

/**
 * Full portfolio scan across many articles.
 * @param {unknown[]} newsItems
 */
export function analyzeNewsRisk(newsItems) {
  const list = Array.isArray(newsItems) ? newsItems : []
  const articles = list.map(normalizeArticle).filter(Boolean)

  /** @type {Record<string, RiskLevel>} */
  const byCountry = {}
  /** @type {RiskLevel} */
  let overall = 'LOW'

  const events = []

  for (let i = 0; i < articles.length; i += 1) {
    const a = articles[i]
    const { countries, level, signals } = riskForArticle(a)
    overall = maxRisk(overall, level)
    for (const c of countries) {
      const key = c.trim() || 'Global'
      byCountry[key] = byCountry[key] ? maxRisk(byCountry[key], level) : level
    }
    if (signals.length) {
      events.push({
        id: a.id,
        title: a.title,
        countries,
        signals,
        level,
      })
    }
  }

  return { overall, byCountry, events, articleCount: articles.length }
}
