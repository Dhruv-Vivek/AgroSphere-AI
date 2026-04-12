const express = require("express");
const axios = require("axios");

const router = express.Router();

function mapArticles(list) {
  return (list || []).map((a) => ({
    title: a.title || "Untitled",
    url: a.url || "",
    source: a.source?.name || "",
    publishedAt: a.publishedAt || "",
    description: (a.description || "").slice(0, 220),
  }));
}

/**
 * GET /api/news/headlines?q=...&pageSize=8
 * Uses NEWSAPI_KEY from environment (newsapi.org).
 */
router.get("/headlines", async (req, res) => {
  const key = process.env.NEWSAPI_KEY?.trim();
  if (!key) {
    return res.json({
      ok: true,
      fallback: true,
      data: [],
      message: "NEWSAPI_KEY is not set in backend .env",
    });
  }

  const pageSize = Math.min(15, Math.max(1, Number(req.query.pageSize) || 8));
  const q =
    typeof req.query.q === "string" && req.query.q.trim()
      ? req.query.q.trim()
      : "(India OR Indian) AND (agriculture OR farming OR crops OR irrigation OR monsoon OR MSP OR farmers)";

  try {
    const { data } = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q,
        language: "en",
        sortBy: "publishedAt",
        pageSize,
        apiKey: key,
      },
      timeout: 15000,
    });

    if (data.status === "error") {
      throw new Error(data.message || "newsapi error");
    }

    return res.json({
      ok: true,
      fallback: false,
      data: mapArticles(data.articles),
    });
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    console.warn("[news] everything failed:", detail);

    try {
      const { data } = await axios.get("https://newsapi.org/v2/top-headlines", {
        params: {
          country: "in",
          category: "business",
          pageSize,
          apiKey: key,
        },
        timeout: 15000,
      });

      if (data.status === "error") {
        throw new Error(data.message || "headlines error");
      }

      return res.json({
        ok: true,
        fallback: true,
        data: mapArticles(data.articles),
        message: "Using India business headlines (agri query unavailable on this plan).",
      });
    } catch (err2) {
      console.error("[news] headlines failed:", err2.response?.data || err2.message);
      return res.status(502).json({
        ok: false,
        data: [],
        error: "Could not load news. Check NEWSAPI_KEY and API quota.",
      });
    }
  }
});

module.exports = router;
