/**
 * Deterministic trading posture from price momentum and structural risk.
 * Outputs are constrained to BUY NOW | HOLD | WAIT for farmer-facing clarity.
 */

/** @typedef {'LOW'|'MEDIUM'|'HIGH'} RiskLevel */
/** @typedef {'up'|'down'|'flat'} PriceTrend */
/** @typedef {'BUY NOW'|'HOLD'|'WAIT'} Recommendation */

/**
 * Compute discrete trend from an ordered price series (oldest → newest).
 * Uses first-vs-last midpoint guard to ignore micro noise when flat.
 * @param {{ price: number }[]} series
 * @returns {PriceTrend}
 */
export function computePriceTrendDirection(series) {
  const pts = Array.isArray(series) ? series : []

  const prices = pts
    .map((p) => {
      if (typeof p === 'number') return p
      if (p && typeof p === 'object') {
        return Number(p.price ?? p.value ?? p)
      }
      return Number(p)
    })
    .filter((n) => Number.isFinite(n))

  if (prices.length < 2) return 'flat'

  const first = prices[0]
  const last = prices[prices.length - 1]

  const mid = (first + last) / 2 || 1
  const deltaPct = ((last - first) / Math.abs(mid)) * 100

  if (deltaPct > 0.35) return 'up'
  if (deltaPct < -0.35) return 'down'
  return 'flat'
}

/**
 * Map risk + trend → action. Designed to be conservative under HIGH risk.
 * @param {{ trend: PriceTrend, riskLevel: RiskLevel }} input
 * @returns {Recommendation}
 */
export function recommendFromTrendAndRisk({ trend, riskLevel }) {
  const r = riskLevel || 'LOW'
  const t = trend || 'flat'

  if (r === 'HIGH') {
    if (t === 'down') return 'WAIT'
    if (t === 'up') return 'HOLD'
    return 'HOLD'
  }

  if (r === 'MEDIUM') {
    if (t === 'up') return 'BUY NOW'
    if (t === 'down') return 'WAIT'
    return 'HOLD'
  }

  if (t === 'up') return 'BUY NOW'
  if (t === 'down') return 'WAIT'
  return 'HOLD'
}

/**
 * Explanation generator (🔥 hackathon-winning feature)
 * Gives human-readable reasoning
 */
export function explainRecommendation({ trend, riskLevel }) {
  const r = riskLevel || 'LOW'
  const t = trend || 'flat'

  if (r === 'HIGH') {
    if (t === 'down') {
      return 'High geopolitical risk with falling prices → safer to wait'
    }
    if (t === 'up') {
      return 'High risk detected; despite rising prices, cautious holding advised'
    }
    return 'High risk environment → avoid immediate buying'
  }

  if (r === 'MEDIUM') {
    if (t === 'up') {
      return 'Moderate risk with rising prices → buying early is beneficial'
    }
    if (t === 'down') {
      return 'Moderate risk but falling prices → wait for stabilization'
    }
    return 'Moderate risk with stable prices → holding recommended'
  }

  if (t === 'up') {
    return 'Low risk and rising prices → good time to buy'
  }

  if (t === 'down') {
    return 'Low risk but prices dropping → waiting is better'
  }

  return 'Stable market conditions → holding recommended'
}

/**
 * Confidence scoring (based on data strength)
 */
export function getRecommendationConfidence(dataPoints) {
  if (!Number.isFinite(dataPoints) || dataPoints <= 0) return 0
  return Math.min(100, Math.round((dataPoints / 10) * 100))
}