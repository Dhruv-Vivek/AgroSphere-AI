import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import axios from "axios"

export default function MarketDetail() {
  const { item } = useParams()

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState("buy") // 🔥 buy or sell
  const [showAd, setShowAd] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/market-live/live"
        )
        setData(res.data.data || [])
      } catch (err) {
        console.log("API error")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filtered = data.filter((d) =>
    d.commodity?.toLowerCase().includes(item.toLowerCase())
  )

  // 🔥 DYNAMIC ADS BASED ON ITEM
  const ads = {
    default: [
      "/ads/ad1.gif",
      "/ads/ad2.gif",
      "/ads/ad3.gif"
    ],
    wheat: ["/ads/wheat1.gif", "/ads/wheat2.gif"],
    rice: ["/ads/rice1.gif", "/ads/rice2.gif"],
    fertilizer: ["/ads/fert1.gif", "/ads/fert2.gif"]
  }

  const getAds = () => {
    const key = item.toLowerCase()
    return ads[key] || ads.default
  }

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <h1 className="text-3xl font-bold">
        {item} Market Details
      </h1>

      {/* 🔥 BUY / SELL TOGGLE */}
      <div className="flex gap-4">
        <button
          onClick={() => setMode("buy")}
          className={`px-4 py-2 rounded ${
            mode === "buy" ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
        >
          Buy Options
        </button>

        <button
          onClick={() => setMode("sell")}
          className={`px-4 py-2 rounded ${
            mode === "sell" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          Sell Options
        </button>
      </div>

      {/* MARKET TABLE */}
      <div className="bg-white border rounded-xl p-4">

        {loading ? (
          <p className="text-center py-10 text-gray-500">
            Loading live data...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-gray-500">
            No live mandi data available
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Mandi</th>
                <th className="p-2">Price</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>

            <tbody>
              {filtered.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t text-center">
                  <td className="p-2">{row.market}</td>
                  <td className="p-2 text-green-600">₹ {row.modal_price}</td>
                  <td className="p-2">{row.arrival_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 🔥 CONDITIONAL OPTIONS */}
      <div className="bg-white border rounded-xl p-4">
        <h2 className="text-xl font-semibold mb-3">
          {mode === "buy" ? "Buy Options" : "Sell Options"}
        </h2>

        <div className="flex gap-4 flex-wrap">

          {mode === "buy" ? (
            <>
              <a
                href={`https://www.amazon.in/s?k=${item}`}
                target="_blank"
                className="bg-yellow-400 px-4 py-2 rounded"
              >
                Amazon
              </a>

              <a
                href={`https://www.flipkart.com/search?q=${item}`}
                target="_blank"
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Flipkart
              </a>

              <a
                href={`https://dir.indiamart.com/search.mp?ss=${item}`}
                target="_blank"
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                IndiaMART
              </a>
            </>
          ) : (
            <>
              <a
                href={`https://dir.indiamart.com/search.mp?ss=${item}`}
                target="_blank"
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Sell on IndiaMART
              </a>

              <a
                href="https://www.agrostar.in/"
                target="_blank"
                className="bg-yellow-500 px-4 py-2 rounded"
              >
                AgroStar
              </a>

              <a
                href="https://www.kisankonnect.in/"
                target="_blank"
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                KisanConnect
              </a>
            </>
          )}
        </div>
      </div>

      {/* 🔥 POPUP ADS */}
      {showAd && (
        <div className="fixed bottom-6 right-6 bg-white border shadow-lg rounded-lg p-3 w-64 z-50">
          <button
            onClick={() => setShowAd(false)}
            className="text-red-500 text-sm float-right"
          >
            ✖
          </button>

          <div className="mt-4 space-y-2">
            {getAds().map((ad, i) => (
              <img
                key={i}
                src={ad}
                alt="ad"
                className="w-full rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}