const marketService = require("../services/marketService");

async function getNews(req, res, next) {
  try {
    const data = await marketService.getMarketNews();
    res.json(data);
  } catch (error) {
    console.error("[marketController] /news failed:", error.message);
    res.json([]);
  }
}

async function getPrices(req, res, next) {
  try {
    const data = await marketService.getMarketPrices();
    res.json(data);
  } catch (error) {
    console.error("[marketController] /prices failed:", error.message);
    res.json([]);
  }
}

async function getAnalysis(req, res, next) {
  try {
    const data = await marketService.getMarketAnalysis();
    res.json(data);
  } catch (error) {
    console.error("[marketController] /analysis failed:", error.message);
    res.json({
      generatedAt: new Date().toISOString(),
      partial: true,
      errors: ["Market analysis unavailable"],
      sources: {
        news: "unavailable",
        prices: "unavailable",
      },
      summary: {
        overallRisk: "LOW",
        overallRecommendation: "HOLD",
        newsArticles: 0,
        trackedMarkets: 0,
        priceTrend: "flat",
        narrative: "No live market intelligence could be assembled from the configured upstream sources.",
      },
      countries: [],
      insights: [],
      news: [],
      prices: [],
      timeSeries: [],
      updatedAt: {
        news: "",
        prices: "",
      },
    });
  }
}

module.exports = {
  getNews,
  getPrices,
  getAnalysis,
};
