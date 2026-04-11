import { useEffect, useState } from "react"
import { fetchPrices, fetchNews } from "../api/marketApi"
import { analyzeNewsRisk } from "../utils/riskAnalysis"
import {
  computePriceTrendDirection,
  recommendFromTrendAndRisk,
} from "../utils/recommendationEngine"

export default function MarketIntelligence() {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [category, setCategory] = useState("fertilizer")

  const loadData = async () => {
    try {
      const [prices, news] = await Promise.all([
        fetchPrices(),
        fetchNews(),
      ])

      const riskProfile = analyzeNewsRisk(news || [])

      const processed = prices.map((item) => {
        const trend = computePriceTrendDirection(
          (item.history || []).map((p) => ({ price: p }))
        )

        // 🔥 Check risk from major supplier countries
        let risk = "LOW"
        const suppliers = Array.isArray(item.majorSources) ? item.majorSources : []
        for (let country of suppliers) {
        }

        const recommendation = recommendFromTrendAndRisk({
          trend,
          riskLevel: risk,
        })

        return {
          ...item,
          risk,
          recommendation,
        }
      })

      setData(processed)
      setFilteredData(processed.filter((d) => d.category === category))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    let ignore = false
    async function init() {
      if (!ignore) {
        await loadData()
      }
    }
    init()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    setFiltered(data.filter(d => d.category === category))
  }, [category, data])

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">
        Market Intelligence (India Focus)
      </h2>

      {/* 🔥 CATEGORY FILTER */}
      <div className="mb-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="fertilizer">Fertilizer</option>
          <option value="food">Food Crops</option>
        </select>
      </div>

      {/* 🔥 TABLE */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Product</th>
            <th className="p-2">Price ($)</th>
            <th className="p-2">Trend</th>
            <th className="p-2">Risk</th>
            <th className="p-2">Recommendation</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map((row, i) => (
            <tr key={i} className="text-center border-t">
              <td className="p-2">{row.product}</td>
              <td className="p-2">{row.price}</td>
              <td className="p-2">{computePriceTrendDirection(
                (row.history || []).map((p) => ({ price: p }))
              )}</td>

              <td
                className={`p-2 font-bold ${
                  row.risk === "HIGH"
                    ? "text-red-500"
                    : row.risk === "MEDIUM"
                    ? "text-yellow-500"
                    : "text-green-500"
                }`}
              >
                {row.risk}
              </td>

              <td className="p-2 font-semibold">
                {row.recommendation}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={loadData}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Refresh Data
      </button>
    </div>
  )
}