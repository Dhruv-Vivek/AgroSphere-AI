import { useEffect, useState } from "react"
import { fetchPrices, fetchNews } from "../api/marketApi"
import mandiData from "../data/mandiData.json"

export default function MarketIntelligence() {
  const [data, setData] = useState([])
  const [news, setNews] = useState([])
  const [category, setCategory] = useState("fertilizer")

  const loadData = async () => {
    try {
      const [prices, newsData] = await Promise.all([
        fetchPrices(),
        fetchNews(),
      ])

      setData(prices || [])
      setNews(newsData || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 🔥 REAL TREND LOGIC (NOT RANDOM)
  const processedTable = mandiData.map((item) => {
    const trend =
      item.price > item.prevPrice1
        ? "UP"
        : item.price < item.prevPrice1
        ? "DOWN"
        : "STABLE"

    let recommendation = "HOLD"
    if (trend === "UP") recommendation = "SELL NOW"
    if (trend === "DOWN") recommendation = "BUY FROM HERE"

    return {
      country: "India",
      company: "Local Mandi",
      product: item.commodity,
      price: item.price,
      trend,
      recommendation,
      source: "Multiple States",
    }
  })

  return (
    <div className="p-6 space-y-6">

      <h2 className="text-2xl font-bold">
        Market Intelligence 🚀
      </h2>

      {/* FILTER (kept but not interfering) */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="border p-2 rounded"
      >
        <option value="fertilizer">Fertilizer</option>
        <option value="food">Food Crops</option>
      </select>

      <div className="grid grid-cols-3 gap-6">

        {/* LEFT: NEW TABLE */}
        <div className="col-span-2 bg-white border rounded p-4">
          <h3 className="font-bold mb-2">Market Data</h3>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Company</th>
                <th className="p-2">Product</th>
                <th className="p-2">Price (₹)</th>
                <th className="p-2">Trend</th>
                <th className="p-2">Action</th>
                <th className="p-2">Buy From</th>
              </tr>
            </thead>

            <tbody>
              {processedTable.map((item, i) => (
                <tr key={i} className="border-t text-center">

                  <td className="p-2 font-semibold">
                    {item.company}
                  </td>

                  <td className="p-2">
                    {item.product}
                  </td>

                  <td className="p-2">
                    ₹ {item.price}
                  </td>

                  <td className="p-2">
                    {item.trend === "UP" && "📈"}
                    {item.trend === "DOWN" && "📉"}
                    {item.trend === "STABLE" && "➡️"}
                  </td>

                  <td className="p-2 font-semibold">
                    {item.recommendation}
                  </td>

                  <td className="p-2 text-sm text-gray-600">
                    {item.source}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT: NEWS (UNCHANGED) */}
        <div className="bg-white border rounded p-4 h-[400px] overflow-y-auto">
          <h3 className="font-bold mb-3">Live Market News 📰</h3>

          {news.map((item, i) => (
            <div
              key={i}
              className="mb-3 p-2 border-b cursor-pointer hover:bg-gray-100"
              onClick={() => window.open(item.url, "_blank")}
            >
              <p className="text-sm font-semibold">{item.title}</p>

              <div className="flex justify-between text-xs mt-1">
                <span>{item.country}</span>

                <span
                  className={
                    item.riskLevel === "HIGH"
                      ? "text-red-500"
                      : item.riskLevel === "MEDIUM"
                      ? "text-yellow-500"
                      : "text-green-500"
                  }
                >
                  {item.riskLevel}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

      <button
        onClick={loadData}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Refresh Data
      </button>

    </div>
  )
}