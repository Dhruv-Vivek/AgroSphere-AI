const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();
const cropsPath = path.join(__dirname, "..", "data", "crops.json");

function loadCrops() {
  try {
    const raw = fs.readFileSync(cropsPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function findCrop(name) {
  const key = String(name || "").trim().toLowerCase();
  return loadCrops().find((c) => String(c.name).toLowerCase() === key);
}

const MOCK_FORECAST = {
  list: [
    { dt_txt: "2026-04-11 12:00:00", pop: 0.35, rain: { "3h": 2.1 }, main: { temp: 31, humidity: 58 } },
    { dt_txt: "2026-04-12 12:00:00", pop: 0.55, rain: { "3h": 6.4 }, main: { temp: 28, humidity: 72 } },
    { dt_txt: "2026-04-13 12:00:00", pop: 0.2, rain: {}, main: { temp: 30, humidity: 61 } },
  ],
  city: { name: "Demo (mock)", country: "IN" },
};

router.get("/crop/:name", (req, res) => {
  try {
    const c = findCrop(req.params.name);
    if (!c) return res.status(404).json({ ok: false, error: "Crop not found", data: null });
    res.json({
      ok: true,
      data: {
        name: c.name,
        water_requirement: c.water_requirement,
        irrigation_schedule: c.irrigation_schedule,
        rainfall_min: c.rainfall_min,
        rainfall_max: c.rainfall_max,
      },
    });
  } catch (err) {
    console.error("irrigation /crop:", err.message);
    res.status(500).json({ ok: false, error: "Failed to load crop", data: null });
  }
});

router.get("/advice", async (req, res) => {
  const cropName = String(req.query.crop || "").trim();
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  const crop = cropName ? findCrop(cropName) : null;
  if (cropName && !crop) {
    return res.status(404).json({ ok: false, error: "Crop not found", data: null });
  }

  let forecast = null;
  let fallback = false;

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || Number.isNaN(lat) || Number.isNaN(lon)) {
    forecast = MOCK_FORECAST;
    fallback = true;
  } else {
    try {
      const url = "https://api.openweathermap.org/data/2.5/forecast";
      const { data } = await axios.get(url, {
        params: { lat, lon, appid: key, units: "metric", cnt: 24 },
        timeout: 15000,
      });
      forecast = data;
    } catch (err) {
      console.error("irrigation forecast:", err.response?.data || err.message);
      forecast = MOCK_FORECAST;
      fallback = true;
    }
  }

  const next = (forecast?.list || []).slice(0, 8);
  const avgPop = next.length ? next.reduce((s, x) => s + (x.pop || 0), 0) / next.length : 0;
  const rainLikely = avgPop > 0.45;

  let suggestion = "Maintain normal schedule; monitor soil moisture at 15–20 cm depth.";
  if (rainLikely) suggestion = "Rain likely in next 24–48h — delay irrigation; check drainage.";
  else if (avgPop < 0.2) suggestion = "Low rain probability — irrigate if tensiometer/feel test indicates dry soil.";

  if (crop?.water_requirement === "High") suggestion += " High water crop: shorten interval if no rain.";
  if (crop?.water_requirement === "Low") suggestion += " Lower water need: avoid over-irrigation.";

  res.json({
    ok: true,
    fallback,
    data: {
      crop: crop
        ? {
            name: crop.name,
            water_requirement: crop.water_requirement,
            irrigation_schedule: crop.irrigation_schedule,
          }
        : null,
      weather_hint: { avg_precip_probability_24h: Number(avgPop.toFixed(2)), rain_likely: rainLikely },
      suggestion,
      raw_forecast_sample: next.slice(0, 3),
    },
  });
});

module.exports = router;
