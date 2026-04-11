import { useEffect, useState } from "react"
import { fetchPrices, fetchNews } from "../api/marketApi"
import mandiData from "../data/mandiData.json"
import agriData from "../data/agriInputsData.json"

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

  // 🔥 FOOD TABLE
  const foodTable = mandiData.map((item) => {
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
      name: item.commodity,
      type: "Crop",
      price: item.price,
      trend,
      recommendation,
    }
  })

  // 🔥 CHEMICAL TABLE
  const chemicalTable = agriData.map((item) => {
    const latest = item.data[item.data.length - 1]
    const prev = item.data[item.data.length - 2]

    const trend =
      latest.price > prev.price
        ? "UP"
        : latest.price < prev.price
        ? "DOWN"
        : "STABLE"

    let recommendation = "HOLD"
    if (trend === "UP") recommendation = "BUY BEFORE INCREASE"
    if (trend === "DOWN") recommendation = "WAIT / BUY LATER"

    return {
      name: item.name,
      type: item.category,
      price: latest.price,
      trend,
      recommendation,
      history: item.data,
    }
  })

  return (
    <div className="p-6 space-y-6">

      <h2 className="text-2xl font-bold">
        Market Intelligence 🚀
      </h2>

      {/* FILTER */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="border p-2 rounded"
      >
        <option value="food">Food Crops</option>
        <option value="fertilizer">Fertilizers & Pesticides</option>
      </select>

      <div className="grid grid-cols-3 gap-6">

        {/* LEFT: TABLE */}
        <div className="col-span-2 bg-white border rounded p-4">
          <h3 className="font-bold mb-2">Market Data</h3>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Type</th>
                <th className="p-2">Price (₹)</th>
                <th className="p-2">Trend</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {(category === "food" ? foodTable : chemicalTable).map((item, i) => (
                <tr key={i} className="border-t text-center">

                  <td className="p-2 font-semibold">
                    {item.name}
                  </td>

                  <td className="p-2">
                    {item.type}
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

                </tr>
              ))}
            </tbody>
          </table>

          {/* 🔥 GRAPH */}
          {category === "fertilizer" && chemicalTable.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-2">Price Trend (Last 4 Months)</h3>

              <div className="flex items-end gap-2 h-40 border p-3">
                {chemicalTable[0].history.map((d, i) => (
                  <div key={i} className="flex flex-col items-center w-10">
                    <div
                      className="bg-blue-500 w-full"
                      style={{ height: `${d.price / 20}px` }}
                    ></div>
                    <span className="text-xs">{d.month.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT: NEWS */}
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