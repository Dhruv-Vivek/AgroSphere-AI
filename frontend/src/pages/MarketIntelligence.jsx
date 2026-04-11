import { useEffect, useState } from "react"
import { fetchAnalysis, fetchPrices, fetchNews } from "../api/marketApi"
import { analyzeNewsRisk, normalizeCountryLabel } from "../utils/riskAnalysis"
import {
  computePriceTrendDirection,
  recommendFromTrendAndRisk,
  explainRecommendation,
  getRecommendationConfidence,
} from "../utils/recommendationEngine"

export default function MarketIntelligence() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError("")

      const [prices, news, analysis] = await Promise.all([
        fetchPrices(),
        fetchNews(),
        fetchAnalysis(),
      ])

      const riskProfile = analyzeNewsRisk(news || [])
      const analysisCountries = Array.isArray(analysis?.countries) ? analysis.countries : []
      const analysisRiskMap = analysisCountries.reduce((acc, item) => {
        const key = normalizeCountryLabel(item?.country || "Global")
        acc[key] = item?.riskLevel || acc[key] || "LOW"
        return acc
      }, {})

      console.log("[MarketIntelligence] news data", news)
      console.log("[MarketIntelligence] riskProfile", riskProfile)
      console.log("[MarketIntelligence] analysis", analysis)

      const processed = (prices || []).map((item) => {
        const country = normalizeCountryLabel(item?.country || "Unknown")

        const trend = computePriceTrendDirection(
          item?.history || [{ price: item?.price }]
        )

        const risk =
          analysisRiskMap[country] ||
          riskProfile?.byCountry?.[country] ||
          "LOW"

        const recommendation = recommendFromTrendAndRisk({
          trend,
          riskLevel: risk,
        })

        const explanation = explainRecommendation({
          trend,
          riskLevel: risk,
        })

        const confidence = getRecommendationConfidence(
          item?.history?.length || 1
        )

        return {
          country,
          price: Number(item?.price) || 0,
          risk,
          recommendation,
          explanation,
          confidence,
        }
      })

      console.log("[MarketIntelligence] processed table data", processed)

      setData(processed)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("[MarketIntelligence] loadData failed", err)
      setError(
        err?.response?.data?.error ||
          err?.userMessage ||
          "Unable to fetch market data. Please ensure backend APIs are running."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 900000) // 15 min
    return () => clearInterval(interval)
  }, [])

  // 🔄 STATES

  if (loading)
    return <div className="p-6">Loading market intelligence...</div>

  if (error)
    return <div className="p-6 text-red-500 font-medium">{error}</div>

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-800">
        Market Intelligence Dashboard
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Last updated: {lastUpdated?.toLocaleTimeString() || "—"}
      </p>

      {data.length === 0 ? (
        <p className="mt-4 text-gray-500">No data available</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">Country</th>
                <th className="p-2">Price</th>
                <th className="p-2">Risk</th>
                <th className="p-2">Recommendation</th>
                <th className="p-2">Confidence</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="text-center border-t">
                  <td className="p-2">{row.country}</td>
                  <td className="p-2">{row.price}</td>

                  <td
                    className={`p-2 font-semibold ${
                      row.risk === "HIGH"
                        ? "text-red-500"
                        : row.risk === "MEDIUM"
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {row.risk}
                  </td>

                  <td
                    className="p-2 font-semibold"
                    title={row.explanation}
                  >
                    {row.recommendation}
                  </td>

                  <td className="p-2">{row.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={loadData}
        className="mt-6 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Refresh Data
      </button>
    </div>
  )
}
