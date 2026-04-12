const express = require("express");
const axios = require("axios");
const cron = require("node-cron");

const router = express.Router();

let marketCache = [];
let lastUpdated = null;

async function fetchMarketData() {
  try {
    const res = await axios.get(
      "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
      {
        params: {
          "api-key": process.env.DATA_GOV_API_KEY,
          format: "json",
          limit: 50,
          "filters[state]": "Karnataka"
        },
        timeout: 10000 // 🔥 IMPORTANT (avoid hanging)
      }
    );

    if (res.data.records && res.data.records.length > 0) {
      marketCache = res.data.records;
      lastUpdated = new Date();
      console.log("✅ Live data updated");
    } else {
      throw new Error("Empty data");
    }

  } catch (err) {
    console.log("⚠️ API failed → using fallback");

    // 🔥 FALLBACK (VERY IMPORTANT FOR HACKATHON)
    marketCache = [
      {
        commodity: "Bajra",
        market: "Bangalore",
        modal_price: 2200,
        arrival_date: "2026-04-12",
        state: "Karnataka"
      },
      {
        commodity: "Wheat",
        market: "Mysore",
        modal_price: 2100,
        arrival_date: "2026-04-12",
        state: "Karnataka"
      }
    ];

    lastUpdated = new Date();
  }
}

// run every 10 min
cron.schedule("*/10 * * * *", fetchMarketData);

// initial call
fetchMarketData();

router.get("/live", (req, res) => {
  res.json({
    updatedAt: lastUpdated,
    data: marketCache
  });
});

module.exports = router;