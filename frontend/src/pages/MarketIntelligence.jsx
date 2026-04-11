import { useEffect, useState } from "react"
import { fetchPrices, fetchNews } from "../api/marketApi"

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

  const filteredData = data.filter(d => d.category === category)

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
        <option value="fertilizer">Fertilizer</option>
        <option value="food">Food Crops</option>
      </select>

      <div className="grid grid-cols-3 gap-6">

        {/* LEFT: TABLE */}
        <div className="col-span-2 bg-white border rounded p-4">
          <h3 className="font-bold mb-2">Market Data</h3>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Product</th>
                <th className="p-2">Price</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((item, i) => (
                <tr key={i} className="border-t text-center">
                  <td className="p-2">{item.product}</td>
                  <td className="p-2">{item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
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