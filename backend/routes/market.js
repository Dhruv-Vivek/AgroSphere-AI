const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const router = express.Router();
const pricesPath = path.join(__dirname, "..", "data", "market_prices.json");

function loadPrices() {
  try {
    const raw = fs.readFileSync(pricesPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const MOCK_PRICES = [
  {
    name: "Wheat",
    current_price: 2400,
    min_price: 2280,
    max_price: 2560,
    trend: "stable",
    demand_index: 0.7,
    state_prices: { Punjab: 2420, Maharashtra: 2380, Karnataka: 2395, "Uttar Pradesh": 2370, Gujarat: 2360 },
    last_updated: new Date().toISOString(),
    unit: "INR per quintal",
    category: "Cereal",
  },
];

router.get("/prices", async (req, res) => {
  try {
    let rows = loadPrices();
    const extUrl = process.env.MARKET_EXTERNAL_URL;

    if (extUrl) {
      try {
        const { data } = await axios.get(extUrl, { timeout: 10000 });
        if (Array.isArray(data)) {
          return res.json({ ok: true, data, fallback: false, source: "external" });
        }
        if (data && Array.isArray(data.prices)) {
          return res.json({ ok: true, data: data.prices, fallback: false, source: "external" });
        }
      } catch (err) {
        console.error("market external:", err.response?.data || err.message);
      }
    }

    if (!rows.length) rows = MOCK_PRICES;
    res.json({ ok: true, data: rows, fallback: !loadPrices().length, source: "local_json" });
  } catch (err) {
    console.error("market /prices:", err.message);
    res.status(500).json({ ok: false, error: "Failed to load prices", data: MOCK_PRICES, fallback: true });
  }
});

router.get("/prices/:name", (req, res) => {
  try {
    const key = String(req.params.name || "").trim().toLowerCase();
    const rows = loadPrices().length ? loadPrices() : MOCK_PRICES;
    const row = rows.find((r) => String(r.name).toLowerCase() === key);
    if (!row) return res.status(404).json({ ok: false, error: "Crop not found", data: null });
    res.json({ ok: true, data: row, fallback: !loadPrices().length });
  } catch (err) {
    console.error("market /prices/:name:", err.message);
    res.status(500).json({ ok: false, error: "Lookup failed", data: null });
  }
});

router.get("/by-state", (req, res) => {
  try {
    const state = String(req.query.state || "").trim();
    if (!state) {
      return res.status(400).json({ ok: false, error: "Query state is required", data: [] });
    }
    const rows = loadPrices().length ? loadPrices() : MOCK_PRICES;
    const out = rows
      .filter((r) => r.state_prices && Object.prototype.hasOwnProperty.call(r.state_prices, state))
      .map((r) => ({
        name: r.name,
        category: r.category,
        unit: r.unit,
        price_in_state: r.state_prices[state],
        current_price: r.current_price,
        trend: r.trend,
        demand_index: r.demand_index,
        last_updated: r.last_updated,
      }));
    res.json({ ok: true, state, count: out.length, data: out, fallback: !loadPrices().length });
  } catch (err) {
    console.error("market /by-state:", err.message);
    res.status(500).json({ ok: false, error: "Filter failed", data: [] });
  }
});

module.exports = router;
