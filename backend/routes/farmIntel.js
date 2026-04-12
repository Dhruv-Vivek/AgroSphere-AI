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
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const MOCK_WEATHER = {
  source: "mock",
  coord: { lat: 20.5937, lon: 78.9629 },
  weather: [{ id: 800, main: "Clear", description: "clear sky", icon: "01d" }],
  main: {
    temp: 29,
    feels_like: 31,
    temp_min: 26,
    temp_max: 32,
    pressure: 1010,
    humidity: 62,
  },
  wind: { speed: 3.2, deg: 270 },
  clouds: { all: 12 },
  name: "Demo Field (India)",
  cod: 200,
};

router.get("/crops", (req, res) => {
  try {
    const crops = loadCrops();
    if (!Array.isArray(crops) || crops.length === 0) {
      return res.status(503).json({
        ok: false,
        error: "Crop database unavailable",
        data: [],
      });
    }
    res.json({ ok: true, count: crops.length, data: crops });
  } catch (err) {
    console.error("farmIntel /crops:", err.message);
    res.status(500).json({ ok: false, error: "Failed to load crops", data: [] });
  }
});

router.get("/crops/:name", (req, res) => {
  try {
    const crops = loadCrops();
    if (!Array.isArray(crops)) {
      return res.status(503).json({ ok: false, error: "Crop database unavailable", data: null });
    }
    const key = String(req.params.name || "").trim().toLowerCase();
    const found = crops.find((c) => String(c.name).toLowerCase() === key);
    if (!found) {
      return res.status(404).json({ ok: false, error: "Crop not found", data: null });
    }
    res.json({ ok: true, data: found });
  } catch (err) {
    console.error("farmIntel /crops/:name:", err.message);
    res.status(500).json({ ok: false, error: "Failed to read crop", data: null });
  }
});

router.get("/weather", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({
      ok: false,
      error: "Query params lat and lon are required numbers",
      data: MOCK_WEATHER,
      fallback: true,
    });
  }

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    return res.json({
      ok: true,
      data: { ...MOCK_WEATHER, coord: { lat, lon } },
      fallback: true,
      message: "OPENWEATHER_API_KEY missing - mock data",
    });
  }

  try {
    const url = "https://api.openweathermap.org/data/2.5/weather";
    const { data } = await axios.get(url, {
      params: { lat, lon, appid: key, units: "metric" },
      timeout: 12000,
    });
    return res.json({ ok: true, data, fallback: false });
  } catch (err) {
    console.error("farmIntel weather API:", err.response?.data || err.message);
    return res.json({
      ok: true,
      data: {
        ...MOCK_WEATHER,
        coord: { lat, lon },
        note: "OpenWeather request failed - mock fallback",
      },
      fallback: true,
    });
  }
});

module.exports = router;
