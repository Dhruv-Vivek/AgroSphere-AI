import { useState } from "react"

const CROP_DETAILS = {
  wheat: {
    soil: "loam",
    water: "medium",
    temp: [10, 25],
    fertilizer: "NPK + Urea",
    steps: ["Prepare land", "Sow seeds", "Apply fertilizer", "Irrigate", "Harvest"]
  },
  rice: {
    soil: "clay",
    water: "high",
    temp: [20, 35],
    fertilizer: "Urea + Potash",
    steps: ["Prepare wet field", "Transplant", "Maintain water", "Fertilize", "Harvest"]
  },
  maize: {
    soil: "loam",
    water: "medium",
    temp: [18, 27],
    fertilizer: "NPK + Zinc",
    steps: ["Prepare soil", "Plant seeds", "Apply nutrients", "Weed control", "Harvest"]
  },
  cotton: {
    soil: "black",
    water: "low",
    temp: [21, 30],
    fertilizer: "NPK + Potash",
    steps: ["Plough", "Sow", "Fertilize", "Pest control", "Pick cotton"]
  },
  sugarcane: {
    soil: "loam",
    water: "high",
    temp: [20, 35],
    fertilizer: "Nitrogen rich",
    steps: ["Prepare ridges", "Plant setts", "Irrigate", "Fertilize", "Harvest"]
  }
}

const CROP_CONFIG = Object.keys(CROP_DETAILS).reduce((acc, key) => {
  acc[key] = {
    label: key.charAt(0).toUpperCase() + key.slice(1),
    cycle: "Varies",
    yield: 20,
    price: 2000
  }
  return acc
}, {})

function getCropAnalysis(crop, farmData, weather) {
  const details = CROP_DETAILS[crop]
  if (!details) return null

  let score = 0
  let reasons = []

  if (farmData.soil && farmData.soil.toLowerCase().includes(details.soil)) {
    score++
  } else {
    reasons.push("Soil not ideal")
  }

  if (weather?.temp) {
    if (weather.temp >= details.temp[0] && weather.temp <= details.temp[1]) {
      score++
    } else {
      reasons.push("Temperature not suitable")
    }
  }

  if (
    farmData.water &&
    farmData.water.toLowerCase().includes(details.water)
  ) {
    score++
  } else {
    reasons.push("Water level not suitable")
  }

  return {
    possible: score >= 2,
    reasons,
    fertilizer: details.fertilizer
  }
}

export default function FarmIntel() {
  const [crop, setCrop] = useState("wheat")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")

  const [farmData, setFarmData] = useState({
    area: "",
    soil: "",
    water: "",
  })

  const [weather, setWeather] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")

  const analysis = getCropAnalysis(crop, farmData, weather)

  const handleApply = async () => {
    setError("")

    if (!farmData.area) {
      setError("Enter area")
      return
    }

    const cfg = CROP_CONFIG[crop]

    const yieldVal = farmData.area * cfg.yield
    const revenue = yieldVal * cfg.price

    setResult({
      cycle: cfg.cycle,
      yield: `${yieldVal.toFixed(1)} qtl`,
      revenue: `₹${revenue.toLocaleString()}`,
      water: farmData.water || "Medium",
    })

    if (lat && lng) {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m`
        )
        const data = await res.json()

        setWeather({
          temp: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
        })
      } catch {}
    }
  }

  return (
    <div className="p-6 space-y-6">

      <h2 className="text-2xl font-bold">Farm Intelligence</h2>

      <div className="flex gap-3 flex-wrap items-center">
        <select value={crop} onChange={(e) => setCrop(e.target.value)} className="border p-2 rounded">
          {Object.entries(CROP_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} className="border p-2 rounded"/>
        <input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} className="border p-2 rounded"/>

        <button onClick={handleApply} className="bg-green-600 text-white px-4 py-2 rounded">
          Apply
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-600 p-2 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-6">

        <div className="bg-white border rounded p-4">
          <h3 className="font-semibold mb-2">Manual Input</h3>

          <input placeholder="Area" value={farmData.area} onChange={(e) => setFarmData({ ...farmData, area: e.target.value })} className="border p-2 rounded w-full mb-2"/>
          <input placeholder="Soil" value={farmData.soil} onChange={(e) => setFarmData({ ...farmData, soil: e.target.value })} className="border p-2 rounded w-full mb-2"/>
          <input placeholder="Water" value={farmData.water} onChange={(e) => setFarmData({ ...farmData, water: e.target.value })} className="border p-2 rounded w-full"/>
        </div>

        <div className="space-y-4">

          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold">Live Weather</h3>
            {weather ? (
              <p>{weather.temp}°C | {weather.humidity}%</p>
            ) : (
              <p className="text-gray-500 text-sm">No data</p>
            )}
          </div>

          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Crop Intelligence</h3>

            {analysis ? (
              <div className="space-y-3">

                <div className={`p-2 rounded text-sm ${
                  analysis.possible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}>
                  {analysis.possible ? "✅ Suitable crop" : "❌ Not recommended"}
                </div>

                {analysis.reasons.length > 0 && (
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {analysis.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}

                <p className="text-sm">🌱 Soil: {CROP_DETAILS[crop].soil}</p>
                <p className="text-sm">💧 Water: {CROP_DETAILS[crop].water}</p>
                <p className="text-sm">🌡 Temp: {CROP_DETAILS[crop].temp[0]}°C - {CROP_DETAILS[crop].temp[1]}°C</p>
                <p className="text-sm">💊 Fertilizer: {analysis.fertilizer}</p>

                <ol className="list-decimal list-inside text-sm">
                  {CROP_DETAILS[crop].steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>

              </div>
            ) : (
              <p className="text-gray-500 text-sm">Enter data to see analysis</p>
            )}
          </div>

        </div>

      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card title="Crop Cycle" value={result?.cycle} />
        <Card title="Expected Yield" value={result?.yield} />
        <Card title="Revenue Potential" value={result?.revenue} />
        <Card title="Water Need" value={result?.water} />
      </div>

    </div>
  )
}

function Card({ title, value }) {
  return (
    <div className="bg-white border rounded p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-lg font-bold">{value || "—"}</p>
    </div>
  )
}