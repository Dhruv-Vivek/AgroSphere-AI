const express = require("express");
const axios = require("axios");

const router = express.Router();

const MOCK_MISSIONS = [
  {
    id: "m1",
    name: "North block — NDVI sweep",
    crop: "Wheat",
    area_acres: 12.4,
    altitude_m: 40,
    battery_pct: 78,
    status: "ready",
    waypoints: [
      { lat: 30.901, lon: 75.8573, action: "hover", seconds: 5 },
      { lat: 30.9021, lon: 75.8585, action: "capture", seconds: 2 },
      { lat: 30.903, lon: 75.8598, action: "capture", seconds: 2 },
    ],
  },
  {
    id: "m2",
    name: "Canal edge — stress map",
    crop: "Cotton",
    area_acres: 8.1,
    altitude_m: 35,
    battery_pct: 64,
    status: "scheduled",
    waypoints: [
      { lat: 19.9975, lon: 73.7898, action: "capture", seconds: 3 },
      { lat: 19.9984, lon: 73.7912, action: "capture", seconds: 3 },
    ],
  },
];

const MOCK_GEOCODE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Demo Farm (mock)", place_type: ["mock"] },
      geometry: { type: "Point", coordinates: [78.9629, 20.5937] },
    },
  ],
};

const MOCK_DIRECTIONS = {
  routes: [
    {
      distance: 1250,
      duration: 420,
      geometry: { type: "LineString", coordinates: [[78.96, 20.59], [78.97, 20.595], [78.98, 20.6]] },
    },
  ],
  source: "mock",
};

router.get("/missions", (req, res) => {
  try {
    res.json({ ok: true, data: MOCK_MISSIONS, fallback: true });
  } catch (err) {
    console.error("drone /missions:", err.message);
    res.status(500).json({ ok: false, error: "Failed to list missions", data: [] });
  }
});

router.get("/missions/:id", (req, res) => {
  try {
    const id = String(req.params.id || "");
    const m = MOCK_MISSIONS.find((x) => x.id === id);
    if (!m) return res.status(404).json({ ok: false, error: "Mission not found", data: null });
    res.json({ ok: true, data: m, fallback: true });
  } catch (err) {
    console.error("drone /missions/:id:", err.message);
    res.status(500).json({ ok: false, error: "Failed to read mission", data: null });
  }
});

router.get("/geocode", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.status(400).json({ ok: false, error: "Query q is required", data: MOCK_GEOCODE, fallback: true });
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return res.json({
      ok: true,
      data: MOCK_GEOCODE,
      fallback: true,
      message: "MAPBOX_TOKEN missing — mock data",
    });
  }

  try {
    const encoded = encodeURIComponent(q);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`;
    const { data } = await axios.get(url, {
      params: { access_token: token, limit: 5, country: "IN" },
      timeout: 12000,
    });
    return res.json({ ok: true, data, fallback: false });
  } catch (err) {
    console.error("drone geocode:", err.response?.data || err.message);
    return res.json({
      ok: true,
      data: MOCK_GEOCODE,
      fallback: true,
      message: "Mapbox geocoding failed — mock data",
    });
  }
});

router.get("/directions", async (req, res) => {
  const parsePair = (s) => {
    if (!s || typeof s !== "string") return null;
    const [a, b] = s.split(",").map((x) => parseFloat(String(x).trim()));
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return [a, b];
  };

  const from = parsePair(req.query.from);
  const to = parsePair(req.query.to);
  if (!from || !to) {
    return res.status(400).json({
      ok: false,
      error: "Query from and to required as lon,lat",
      data: MOCK_DIRECTIONS,
      fallback: true,
    });
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return res.json({
      ok: true,
      data: MOCK_DIRECTIONS,
      fallback: true,
      message: "MAPBOX_TOKEN missing — mock data",
    });
  }

  try {
    const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`;
    const { data } = await axios.get(url, {
      params: { access_token: token, geometries: "geojson", overview: "full" },
      timeout: 15000,
    });
    return res.json({ ok: true, data, fallback: false });
  } catch (err) {
    console.error("drone directions:", err.response?.data || err.message);
    return res.json({
      ok: true,
      data: MOCK_DIRECTIONS,
      fallback: true,
      message: "Mapbox directions failed — mock data",
    });
  }
});

module.exports = router;
