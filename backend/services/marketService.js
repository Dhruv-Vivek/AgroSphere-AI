const axios = require("axios");
const XLSX = require("xlsx");

const CACHE_TTL_MS = Number(process.env.MARKET_CACHE_TTL_MS) || 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.MARKET_REQUEST_TIMEOUT_MS) || 15000;
const MAX_RETRIES = 3;

const NEWSAPI_URL = process.env.NEWSAPI_URL || "https://newsapi.org/v2/everything";
const GDELT_URL = process.env.GDELT_URL || "https://api.gdeltproject.org/api/v2/doc/doc";
const WORLD_BANK_MONTHLY_URL =
  process.env.WORLD_BANK_MONTHLY_URL ||
  "https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx";
const FERTILIZER_PRICE_URL =
  process.env.FERTILIZER_PRICE_URL || "https://fertilizerprice.com/";
const MARKET_DEBUG = process.env.MARKET_DEBUG !== "false";

const NEWS_KEYWORDS = [
  "fertilizer",
  "agriculture",
  "export ban",
  "sanctions",
  "port",
  "conflict",
];

const KEYWORD_PRIORITY = [
  { keyword: "export ban", pattern: /\bexport ban\b|\bexport curb\b|\bexport restriction\b/gi, level: "MEDIUM" },
  { keyword: "sanctions", pattern: /\bsanction(s|ed)?\b|\bshortage(s)?\b|\bvolatility\b|\bsupply shock(s)?\b|\bdisruption(s)?\b/gi, level: "MEDIUM" },
  { keyword: "conflict", pattern: /\bconflict\b|\bwar\b|\binvasion\b|\battack\b|\bhostilities\b|\bmissile\b|\bairstrike\b|\bmilitary strike\b/gi, level: "HIGH" },
  { keyword: "port", pattern: /\bport\b|\bshipping\b|\bshipment\b|\bfreight\b|\bmaritime\b|\bstrait\b|\bclosure\b/gi, level: "MEDIUM" },
  { keyword: "fertilizer", pattern: /\bfertilizer(s)?\b|\burea\b|\bdap\b|\bpotash\b|\bphosphate\b/gi, level: "LOW" },
  { keyword: "agriculture", pattern: /\bagriculture\b|\bfarming\b|\bfarmers?\b|\bcrop(s)?\b|\bgrain\b|\bfood security\b|\bfarm sector\b/gi, level: "LOW" },
];

const COUNTRY_PATTERNS = [
  { label: "United States", pattern: /\bunited states\b|\busa\b|\bu\.s\.\b|\bus gulf\b/gi },
  { label: "United Kingdom", pattern: /\bunited kingdom\b|\buk\b|\bbritain\b/gi },
  { label: "European Union", pattern: /\beuropean union\b|\beu\b/gi },
  { label: "India", pattern: /\bindia\b/gi },
  { label: "China", pattern: /\bchina\b/gi },
  { label: "Russia", pattern: /\brussia\b/gi },
  { label: "Ukraine", pattern: /\bukraine\b|\bblack sea\b/gi },
  { label: "Brazil", pattern: /\bbrazil\b/gi },
  { label: "Canada", pattern: /\bcanada\b|\bvancouver\b/gi },
  { label: "Belarus", pattern: /\bbelarus\b/gi },
  { label: "Morocco", pattern: /\bmorocco\b/gi },
  { label: "North Africa", pattern: /\bnorth africa\b/gi },
  { label: "Middle East", pattern: /\bmiddle east\b|\bgulf\b/gi },
  { label: "Saudi Arabia", pattern: /\bsaudi arabia\b/gi },
  { label: "Qatar", pattern: /\bqatar\b/gi },
  { label: "Egypt", pattern: /\begypt\b/gi },
  { label: "Turkey", pattern: /\bturkey\b|\bturkiye\b/gi },
  { label: "Iran", pattern: /\biran\b/gi },
  { label: "Israel", pattern: /\bisrael\b/gi },
  { label: "Indonesia", pattern: /\bindonesia\b/gi },
  { label: "Bangladesh", pattern: /\bbangladesh\b/gi },
  { label: "Pakistan", pattern: /\bpakistan\b/gi },
  { label: "Australia", pattern: /\baustralia\b/gi },
];

const WORLD_BANK_SERIES = [
  {
    country: "United States",
    commodity: "DAP / TSP benchmark",
    company: "World Bank Pink Sheet",
    unit: "USD per metric ton",
    columns: ["DAP", "TSP"],
    riskCountries: ["United States"],
  },
  {
    country: "Brazil",
    commodity: "Potassium chloride",
    company: "World Bank Pink Sheet",
    unit: "USD per metric ton",
    columns: ["Potassium chloride"],
    riskCountries: ["Brazil", "Belarus", "Canada"],
  },
  {
    country: "Ukraine",
    commodity: "Urea",
    company: "World Bank Pink Sheet",
    unit: "USD per metric ton",
    columns: ["Urea"],
    riskCountries: ["Ukraine", "Russia", "Belarus", "Black Sea"],
  },
  {
    country: "North Africa",
    commodity: "Phosphate rock",
    company: "World Bank Pink Sheet",
    unit: "USD per metric ton",
    columns: ["Phosphate rock"],
    riskCountries: ["North Africa", "Morocco", "Egypt", "Middle East", "Saudi Arabia"],
  },
];

const cache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function debugLog(label, payload) {
  if (!MARKET_DEBUG) return;
  console.log(`[marketService] ${label}:`, payload);
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeText(value, fallback = "") {
  if (value == null) return fallback;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function sanitizeCountryName(value) {
  const text = sanitizeText(value, "Global");
  const normalized = text
    .replace(/\busa\b/gi, "United States")
    .replace(/\bu\.s\.a\.\b/gi, "United States")
    .replace(/\bu\.s\.\b/gi, "United States")
    .replace(/\buk\b/gi, "United Kingdom")
    .replace(/\beu\b/gi, "European Union");
  return normalized
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z]{2,}$/.test(word)) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function sanitizeHeaderLabel(value) {
  return sanitizeText(value)
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatMonthLabel(value) {
  const text = sanitizeText(value);
  const match = /^(\d{4})M(\d{2})$/.exec(text);
  if (!match) return text;
  return `${match[1]}-${match[2]}-01`;
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function extractCountries(text) {
  const haystack = sanitizeText(text).toLowerCase();
  if (!haystack) return ["Global"];

  const matches = [];
  for (const entry of COUNTRY_PATTERNS) {
    entry.pattern.lastIndex = 0;
    if (entry.pattern.test(haystack)) {
      matches.push(entry.label);
    }
  }

  return matches.length ? dedupeBy(matches, (item) => item.toLowerCase()) : ["Global"];
}

function extractKeywords(text) {
  const haystack = sanitizeText(text).toLowerCase();
  const matches = [];
  for (const entry of KEYWORD_PRIORITY) {
    entry.pattern.lastIndex = 0;
    if (entry.pattern.test(haystack)) {
      matches.push(entry.keyword);
    }
  }
  return matches;
}

function detectRiskLevel(text) {
  const haystack = sanitizeText(text).toLowerCase();
  if (/\bconflict\b|\bwar\b|\binvasion\b|\battack\b|\bhostilities\b|\bmissile\b|\bairstrike\b|\bmilitary strike\b/.test(haystack)) {
    return "HIGH";
  }
  if (/\bsanction(s|ed)?\b|\bexport ban\b|\bexport curb\b|\bexport restriction\b|\bport closure\b|\bshipping delay\b|\bstrait closure\b|\bshortage(s)?\b|\bvolatility\b|\bsupply shock(s)?\b|\bdisruption(s)?\b/.test(haystack)) {
    return "MEDIUM";
  }
  return "LOW";
}

function compareRiskLevels(a, b) {
  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function computeTrend(history) {
  const prices = (Array.isArray(history) ? history : [])
    .map((entry) => toFiniteNumber(entry && entry.price))
    .filter((value) => value != null);

  if (prices.length < 2) return "flat";

  const first = prices[0];
  const last = prices[prices.length - 1];
  const midpoint = (Math.abs(first) + Math.abs(last)) / 2 || 1;
  const deltaPct = ((last - first) / midpoint) * 100;

  if (deltaPct > 1) return "up";
  if (deltaPct < -1) return "down";
  return "flat";
}

function calculateChangePercent(history) {
  const prices = (Array.isArray(history) ? history : [])
    .map((entry) => toFiniteNumber(entry && entry.price))
    .filter((value) => value != null);

  if (prices.length < 2 || !prices[0]) return 0;
  return Number((((prices[prices.length - 1] - prices[0]) / prices[0]) * 100).toFixed(2));
}

function recommendFromRiskAndTrend(riskLevel, trend) {
  if (riskLevel === "HIGH") {
    return trend === "down" ? "WAIT" : "HOLD";
  }
  if (riskLevel === "MEDIUM") {
    if (trend === "up") return "BUY NOW";
    if (trend === "down") return "WAIT";
    return "HOLD";
  }
  if (trend === "up") return "BUY NOW";
  if (trend === "down") return "WAIT";
  return "HOLD";
}

function recommendationReason(riskLevel, trend) {
  if (riskLevel === "HIGH" && trend === "up") {
    return "High conflict risk is pushing prices up, so holding inventory is safer than rushing new purchases.";
  }
  if (riskLevel === "HIGH" && trend === "down") {
    return "High conflict risk with easing prices suggests waiting for stability before buying.";
  }
  if (riskLevel === "MEDIUM" && trend === "up") {
    return "Trade restrictions are present and prices are climbing, so securing supply early is prudent.";
  }
  if (riskLevel === "MEDIUM" && trend === "down") {
    return "Trade risk exists but prices are cooling, so it is reasonable to wait for confirmation.";
  }
  if (trend === "up") {
    return "Low geopolitical pressure with rising prices supports early buying.";
  }
  if (trend === "down") {
    return "Low geopolitical pressure with softer prices supports waiting for a better entry.";
  }
  return "Risk and price momentum are both stable, so holding is the balanced choice.";
}

function buildQueryString() {
  return '((fertilizer OR urea OR potash OR phosphate OR ammonia OR "fertilizer prices" OR "crop nutrient" OR "food crisis") OR ((agriculture OR farming OR "farm sector" OR grain) AND ("export ban" OR sanctions OR port OR shipping OR conflict OR war)))';
}

async function requestWithRetry(url, options = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await axios({
        url,
        timeout: REQUEST_TIMEOUT_MS,
        ...options,
      });
    } catch (error) {
      lastError = error;
      const status = error.response && error.response.status;
      const retryable =
        !status ||
        status === 408 ||
        status === 429 ||
        status >= 500 ||
        error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK";

      console.error(
        `[marketService] request failed (${attempt}/${MAX_RETRIES}) for ${url}:`,
        error.response && error.response.data ? error.response.data : error.message
      );

      if (!retryable || attempt === MAX_RETRIES) {
        break;
      }

      const delayMs = status === 429 ? 5500 * attempt : 500 * attempt;
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function getOrRefreshCache(key, loader, ttlMs = CACHE_TTL_MS) {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.value && cached.expiresAt > now) {
    return cached.value;
  }

  if (cached && cached.promise) {
    return cached.promise;
  }

  let promise = null;
  promise = (async () => {
    try {
      const value = await loader(cached && cached.lastGood);
      cache.set(key, {
        value,
        lastGood: value,
        expiresAt: Date.now() + ttlMs,
        promise: null,
      });
      return value;
    } catch (error) {
      console.error(`[marketService] ${key} refresh failed:`, error.message);
      if (cached && cached.lastGood) {
        cache.set(key, {
          value: cached.lastGood,
          lastGood: cached.lastGood,
          expiresAt: Date.now() + Math.min(ttlMs, 5 * 60 * 1000),
          promise: null,
        });
        return cached.lastGood;
      }
      throw error;
    } finally {
      const latest = cache.get(key);
      if (latest && latest.promise === promise) {
        cache.set(key, {
          value: latest.value || null,
          lastGood: latest.lastGood || null,
          expiresAt: latest.expiresAt || 0,
          promise: null,
        });
      }
    }
  })();

  cache.set(key, {
    value: cached && cached.value ? cached.value : null,
    lastGood: cached && cached.lastGood ? cached.lastGood : null,
    expiresAt: cached && cached.expiresAt ? cached.expiresAt : 0,
    promise,
  });

  return promise;
}

function normalizeNewsItem(raw, index) {
  const title = sanitizeText(raw && raw.title, `Untitled article ${index + 1}`);
  const description = sanitizeText(
    (raw && (raw.description || raw.summary || raw.content || raw.snippet || raw.seotext)) || "",
    title
  );
  const source = sanitizeText(
    raw &&
      (raw.sourceName ||
        (raw.source && raw.source.name) ||
        raw.domain ||
        raw.sourcecountry ||
        raw.domainname),
    "Unknown source"
  );
  const url = sanitizeText(raw && (raw.url || raw.socialimage || raw.sourceurl), "");
  const publishedAt = sanitizeText(
    raw && (raw.publishedAt || raw.seendate || raw.date || raw.pubdate),
    ""
  );
  const countries = extractCountries(`${title} ${description} ${source}`);
  const keywords = extractKeywords(`${title} ${description}`);
  const riskLevel = detectRiskLevel(`${title} ${description}`);

  return {
    title,
    country: sanitizeCountryName(countries[0] || "Global"),
    countries: countries.map((country) => sanitizeCountryName(country)),
    description,
    source,
    publishedAt,
    url,
    keywords,
    riskLevel,
  };
}

function isRelevantMarketArticle(item) {
  const text = `${sanitizeText(item && item.title)} ${sanitizeText(item && item.description)}`.toLowerCase();
  const hasMarketContext =
    /\bfertilizer\b|\burea\b|\bpotash\b|\bphosphate\b|\bcrop nutrient\b/.test(text) ||
    /\bagriculture\b|\bfarming\b|\bcrop(s)?\b|\bgrain\b|\bfood security\b|\bfarm sector\b/.test(text);
  const hasTradeOrRiskContext =
    /\bexport\b|\bsanction(s|ed)?\b|\bport\b|\bshipping\b|\bconflict\b|\bwar\b|\bprice(s)?\b|\bmarket(s)?\b|\bclosure\b|\bfood crisis\b/.test(text);
  const hasExcludedNoise =
    /\bdock review\b|\bweekly deals\b|\bhome depot\b|\biphone\b|\bmacbook\b|\bbatter(y|ies)\b|\blithium\b|\bthunderbolt\b|\bfarming sim\b|\bthriller game\b|\bamazon\b|\bsale\b|\bsitewide\b/.test(text);

  return !hasExcludedNoise && (hasMarketContext || (hasTradeOrRiskContext && /\bagriculture\b|\bfarming\b|\bcrop(s)?\b|\bfertilizer\b/.test(text)));
}

async function fetchNewsFromNewsApi() {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    throw new Error("NEWSAPI_KEY is not configured");
  }

  const response = await requestWithRetry(NEWSAPI_URL, {
    method: "GET",
    params: {
      q: buildQueryString(),
      language: "en",
      sortBy: "publishedAt",
      pageSize: 50,
      searchIn: "title,description",
    },
    headers: {
      "X-Api-Key": apiKey,
      Accept: "application/json",
    },
  });

  const articles = Array.isArray(response.data && response.data.articles)
    ? response.data.articles
    : [];
  debugLog("NewsAPI raw response", {
    totalResults: response.data && response.data.totalResults,
    received: articles.length,
    sampleTitles: articles.slice(0, 5).map((item) => sanitizeText(item && item.title)),
  });
  const normalized = articles.map(normalizeNewsItem);
  const filtered = normalized.filter(
    (item) => sanitizeText(item.title) && isRelevantMarketArticle(item)
  );
  debugLog("NewsAPI filtered articles", {
    kept: filtered.length,
    sample: filtered.slice(0, 5).map((item) => ({
      title: item.title,
      country: item.country,
      countries: item.countries,
      riskLevel: item.riskLevel,
      keywords: item.keywords,
    })),
  });

  return {
    source: "newsapi.org",
    updatedAt: new Date().toISOString(),
    articles: dedupeBy(
      filtered,
      (item) => `${item.title.toLowerCase()}|${item.country.toLowerCase()}`
    ),
  };
}

async function fetchNewsFromGdelt() {
  const response = await requestWithRetry(GDELT_URL, {
    method: "GET",
    params: {
      query: buildQueryString(),
      mode: "artlist",
      maxrecords: 25,
      timespan: "7days",
      sort: "datedesc",
      format: "json",
    },
    headers: {
      Accept: "application/json",
    },
  });

  const articles = Array.isArray(response.data && response.data.articles)
    ? response.data.articles
    : [];
  debugLog("GDELT raw response", {
    received: articles.length,
    sampleTitles: articles.slice(0, 5).map((item) => sanitizeText(item && item.title)),
  });
  const normalized = articles.map(normalizeNewsItem);
  const filtered = normalized.filter(
    (item) => sanitizeText(item.title) && isRelevantMarketArticle(item)
  );
  debugLog("GDELT filtered articles", {
    kept: filtered.length,
    sample: filtered.slice(0, 5).map((item) => ({
      title: item.title,
      country: item.country,
      countries: item.countries,
      riskLevel: item.riskLevel,
      keywords: item.keywords,
    })),
  });

  return {
    source: "gdelt",
    updatedAt: new Date().toISOString(),
    articles: dedupeBy(
      filtered,
      (item) => `${item.title.toLowerCase()}|${item.country.toLowerCase()}`
    ),
  };
}

async function loadNewsSnapshot() {
  return getOrRefreshCache("market-news", async (lastGood) => {
    try {
      return await fetchNewsFromNewsApi();
    } catch (newsApiError) {
      console.error("[marketService] NewsAPI failed, falling back to GDELT:", newsApiError.message);
      try {
        return await fetchNewsFromGdelt();
      } catch (gdeltError) {
        console.error("[marketService] GDELT fallback failed:", gdeltError.message);
        if (lastGood && Array.isArray(lastGood.articles)) {
          return lastGood;
        }
        return {
          source: "unavailable",
          updatedAt: new Date().toISOString(),
          articles: [],
        };
      }
    }
  });
}

function extractWorkbookUpdatedAt(rows) {
  const updatedRow = rows.find((row) => sanitizeText(row && row[0]).startsWith("Updated on "));
  return updatedRow ? sanitizeText(updatedRow[0]).replace("Updated on ", "") : "";
}

function normalizeHistoryEntries(entries, limit = 12) {
  return entries.slice(-limit).map((entry) => ({
    date: sanitizeText(entry.date),
    price: Number(entry.price.toFixed(2)),
  }));
}

function aggregateSeriesForCountry(rows, headerIndex, config) {
  const result = [];

  for (const row of rows) {
    const rawDate = sanitizeText(row && row[0]);
    if (!/^\d{4}M\d{2}$/.test(rawDate)) continue;

    const values = config.columns
      .map((column) => {
        const idx = headerIndex.get(sanitizeHeaderLabel(column));
        if (idx == null) return null;
        return toFiniteNumber(row[idx]);
      })
      .filter((value) => value != null);

    if (!values.length) continue;

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    result.push({
      date: formatMonthLabel(rawDate),
      price: average,
    });
  }

  return normalizeHistoryEntries(result);
}

function buildWorldBankMarkets(workbook) {
  const priceRows = XLSX.utils.sheet_to_json(workbook.Sheets["Monthly Prices"], {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });
  const indexRows = XLSX.utils.sheet_to_json(workbook.Sheets["Monthly Indices"], {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });

  const headers = Array.isArray(priceRows[4]) ? priceRows[4] : [];
  const headerIndex = new Map();
  headers.forEach((header, index) => {
    const key = sanitizeHeaderLabel(header);
    if (key) headerIndex.set(key, index);
  });

  const updatedAt = extractWorkbookUpdatedAt(priceRows);
  const markets = WORLD_BANK_SERIES.map((config) => {
    const history = aggregateSeriesForCountry(priceRows, headerIndex, config);
    const latest = history[history.length - 1];

    return {
      country: sanitizeCountryName(config.country),
      price: latest ? latest.price : 0,
      history,
      commodity: config.commodity,
      crop: config.commodity,
      name: config.commodity,
      company: config.company,
      source: "world_bank_pink_sheet",
      unit: config.unit,
      riskCountries: config.riskCountries || [config.country],
      trend: computeTrend(history),
      changePercent: calculateChangePercent(history),
      lastUpdated: sanitizeText(updatedAt),
    };
  }).filter((entry) => entry.history.length > 0);

  const rawFertilizerColumnIndex = Array.isArray(indexRows[5])
    ? indexRows[5].findIndex((cell) => sanitizeText(cell).includes("Fertilizers"))
    : -1;
  const fertilizerColumnIndex = rawFertilizerColumnIndex >= 0 ? rawFertilizerColumnIndex : 13;
  const timeSeries = normalizeHistoryEntries(
    indexRows
      .filter((row) => /^\d{4}M\d{2}$/.test(sanitizeText(row && row[0])))
      .map((row) => ({
        date: formatMonthLabel(row[0]),
        price: toFiniteNumber(row[fertilizerColumnIndex]),
      }))
      .filter((row) => row.price != null)
  );

  return {
    source: "world_bank_pink_sheet",
    updatedAt: sanitizeText(updatedAt) || new Date().toISOString(),
    markets,
    timeSeries,
  };
}

function parseFertilizerPriceHtml(html) {
  const text = sanitizeText(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#36;/g, "$")
  );

  const productPatterns = [
    "Urea",
    "DAP",
    "MAP",
    "Potash",
    "Anhydrous Ammonia",
    "10-34-0",
    "Ammonium Sulfate",
  ];

  const markets = [];
  for (const product of productPatterns) {
    const pattern = new RegExp(`${product}\\s*\\$?\\s*([0-9]+(?:\\.[0-9]+)?)`, "i");
    const match = pattern.exec(text);
    if (!match) continue;

    const price = toFiniteNumber(match[1]);
    if (price == null) continue;

    markets.push({
      country: "United States",
      price: Number(price.toFixed(2)),
      history: [{ date: new Date().toISOString().slice(0, 10), price: Number(price.toFixed(2)) }],
      commodity: product,
      crop: product,
      name: product,
      company: "Fertilizer Price",
      source: "fertilizerprice.com",
      unit: "USD per short ton",
      trend: "flat",
      changePercent: 0,
      lastUpdated: new Date().toISOString(),
    });
  }

  return markets;
}

async function fetchWorldBankPrices() {
  const response = await requestWithRetry(WORLD_BANK_MONTHLY_URL, {
    method: "GET",
    responseType: "arraybuffer",
    headers: {
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream",
    },
  });

  const workbook = XLSX.read(response.data, { type: "buffer" });
  return buildWorldBankMarkets(workbook);
}

async function fetchFertilizerPriceFallback() {
  const response = await requestWithRetry(FERTILIZER_PRICE_URL, {
    method: "GET",
    responseType: "text",
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const markets = parseFertilizerPriceHtml(response.data);
  return {
    source: "fertilizerprice.com",
    updatedAt: new Date().toISOString(),
    markets,
    timeSeries: [],
  };
}

async function loadPriceSnapshot() {
  return getOrRefreshCache("market-prices", async (lastGood) => {
    try {
      return await fetchWorldBankPrices();
    } catch (worldBankError) {
      console.error(
        "[marketService] World Bank price feed failed, falling back to fertilizerprice.com:",
        worldBankError.message
      );
      try {
        return await fetchFertilizerPriceFallback();
      } catch (fallbackError) {
        console.error("[marketService] fertilizerprice.com fallback failed:", fallbackError.message);
        if (lastGood && Array.isArray(lastGood.markets)) {
          return lastGood;
        }
        return {
          source: "unavailable",
          updatedAt: new Date().toISOString(),
          markets: [],
          timeSeries: [],
        };
      }
    }
  });
}

function buildCountryNewsIndex(newsItems) {
  const riskByCountry = new Map();
  const headlinesByCountry = new Map();
  const keywordsByCountry = new Map();
  let overallRisk = "LOW";

  for (const item of newsItems) {
    overallRisk = compareRiskLevels(overallRisk, item.riskLevel || "LOW");
    const countries = Array.isArray(item.countries) && item.countries.length ? item.countries : [item.country || "Global"];

    for (const rawCountry of countries) {
      const country = sanitizeCountryName(rawCountry || "Global");
      const currentRisk = riskByCountry.get(country) || "LOW";
      riskByCountry.set(country, compareRiskLevels(currentRisk, item.riskLevel || "LOW"));

      const headlines = headlinesByCountry.get(country) || [];
      headlines.push(item.title);
      headlinesByCountry.set(country, headlines.slice(0, 5));

      const keywords = keywordsByCountry.get(country) || new Set();
      for (const keyword of item.keywords || []) {
        keywords.add(keyword);
      }
      keywordsByCountry.set(country, keywords);
    }
  }

  return {
    overallRisk,
    riskByCountry,
    headlinesByCountry,
    keywordsByCountry,
  };
}

function resolveMarketRisk(newsIndex, market) {
  const explicitMatches = Array.isArray(market.riskCountries) ? market.riskCountries : [market.country];
  let level = "LOW";
  const matchedCountries = [];

  for (const candidate of explicitMatches) {
    const normalized = sanitizeCountryName(candidate);
    const candidateRisk = newsIndex.riskByCountry.get(normalized);
    if (candidateRisk) {
      level = compareRiskLevels(level, candidateRisk);
      matchedCountries.push(normalized);
    }
  }

  const globalRisk = newsIndex.riskByCountry.get("Global") || "LOW";
  const marketWideRisk = globalRisk === "HIGH" || globalRisk === "MEDIUM" ? globalRisk : newsIndex.overallRisk;
  if (matchedCountries.length === 0 && (marketWideRisk === "HIGH" || marketWideRisk === "MEDIUM")) {
    level = "MEDIUM";
    matchedCountries.push(globalRisk === "HIGH" || globalRisk === "MEDIUM" ? "Global" : "Market-wide");
  }

  return {
    level,
    matchedCountries,
  };
}

async function getMarketNews() {
  const snapshot = await loadNewsSnapshot();
  const mapped = snapshot.articles.map((item) => ({
    title: item.title,
    country: item.country,
    countries: item.countries,
    description: item.description,
    source: item.source,
    publishedAt: item.publishedAt,
    riskLevel: item.riskLevel,
    keywords: item.keywords,
    url: item.url,
  }));
  debugLog("Market news mapped output", {
    count: mapped.length,
    byRisk: mapped.reduce((acc, item) => {
      acc[item.riskLevel] = (acc[item.riskLevel] || 0) + 1;
      return acc;
    }, {}),
    sample: mapped.slice(0, 5),
  });
  return mapped;
}

async function getMarketPrices() {
  const priceSnapshot = await loadPriceSnapshot()
  const markets = Array.isArray(priceSnapshot.markets) ? priceSnapshot.markets : []

  return markets.map((item, index) => {
    const history = Array.isArray(item.history)
      ? item.history.map((entry) => {
          const rawPrice =
            entry == null
              ? null
              : typeof entry === "object"
              ? entry.price ?? entry.value ?? null
              : entry
          return {
            date: sanitizeText(entry && entry.date, ""),
            price: Number(toFiniteNumber(rawPrice) ?? 0),
          }
        })
      : []

    const normalizedHistory = history.length
      ? history
      : [{ date: "", price: Number(toFiniteNumber(item.price) ?? 0) }]

    return {
      country: sanitizeCountryName(item.country || item.name || `Market ${index + 1}`),
      price: Number(toFiniteNumber(item.price) ?? 0),
      history: normalizedHistory,
      commodity: sanitizeText(item.commodity || item.name || "Fertilizer"),
      unit: sanitizeText(item.unit || item.source || "USD per ton"),
      source: sanitizeText(item.source || "world_bank_pink_sheet"),
      trend: String(item.trend || computeTrend(normalizedHistory)).toLowerCase(),
      changePercent: Number(item.changePercent ?? 0),
      lastUpdated: sanitizeText(item.lastUpdated || priceSnapshot.updatedAt || new Date().toISOString()),
      majorSources: Array.isArray(item.majorSources) ? item.majorSources.map((source) => sanitizeCountryName(source)) : [],
      category: sanitizeText(item.category || "fertilizer"),
    }
  })
}

async function getMarketAnalysis() {
  const settled = await Promise.allSettled([loadNewsSnapshot(), loadPriceSnapshot()]);
  const errors = [];

  const newsSnapshot =
    settled[0].status === "fulfilled"
      ? settled[0].value
      : { source: "unavailable", updatedAt: "", articles: [] };
  if (settled[0].status !== "fulfilled") {
    errors.push("News feed unavailable");
  }
  if (newsSnapshot.source === "unavailable") {
    errors.push("News feed unavailable");
  }

  const priceSnapshot =
    settled[1].status === "fulfilled"
      ? settled[1].value
      : { source: "unavailable", updatedAt: "", markets: [], timeSeries: [] };
  if (settled[1].status !== "fulfilled") {
    errors.push("Price feed unavailable");
  }
  if (priceSnapshot.source === "unavailable") {
    errors.push("Price feed unavailable");
  }

  const newsIndex = buildCountryNewsIndex(newsSnapshot.articles);
  const countries = priceSnapshot.markets.map((market) => {
    const riskResolution = resolveMarketRisk(newsIndex, market);
    const riskLevel = riskResolution.level;
    const recommendation = recommendFromRiskAndTrend(riskLevel, market.trend);
    const keywords = Array.from(
      new Set(
        (market.riskCountries || [market.country]).flatMap((country) =>
          Array.from(newsIndex.keywordsByCountry.get(sanitizeCountryName(country)) || [])
        )
      )
    );
    const headlines = (market.riskCountries || [market.country]).flatMap(
      (country) => newsIndex.headlinesByCountry.get(sanitizeCountryName(country)) || []
    ).slice(0, 5);

    return {
      country: market.country,
      price: market.price,
      trend: market.trend,
      riskLevel,
      recommendation,
      reason: recommendationReason(riskLevel, market.trend),
      keywords,
      headlines,
      history: market.history,
      commodity: market.commodity,
      changePercent: market.changePercent,
      unit: market.unit,
      matchedRiskCountries: riskResolution.matchedCountries,
    };
  });

  const dominantRiskCountry =
    newsSnapshot.articles.length > 0
      ? countries.find((entry) => entry.riskLevel === "HIGH") ||
        countries.find((entry) => entry.riskLevel === "MEDIUM") ||
        countries[0] ||
        null
      : null;
  const globalTrend = computeTrend(priceSnapshot.timeSeries);
  const overallRecommendation = recommendFromRiskAndTrend(newsIndex.overallRisk, globalTrend);

  const insights = [];
  if (dominantRiskCountry) {
    insights.push({
      type: "risk",
      level: dominantRiskCountry.riskLevel,
      country: dominantRiskCountry.country,
      message: `${dominantRiskCountry.country} is the highest-risk fertilizer supply benchmark in the current news window.`,
    });
  }
  if (priceSnapshot.timeSeries.length >= 2) {
    const latestPoint = priceSnapshot.timeSeries[priceSnapshot.timeSeries.length - 1];
    insights.push({
      type: "price",
      level: globalTrend === "up" ? "MEDIUM" : "LOW",
      country: "Global",
      message: `The World Bank fertilizer index is trending ${globalTrend} with the latest value at ${latestPoint.price}.`,
    });
  }
  if (countries.length) {
    const topRecommendation = countries[0];
    insights.push({
      type: "recommendation",
      level: topRecommendation.riskLevel,
      country: topRecommendation.country,
      message: `${topRecommendation.country} benchmark suggests ${topRecommendation.recommendation}. ${topRecommendation.reason}`,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    partial: errors.length > 0,
    errors,
    sources: {
      news: newsSnapshot.source,
      prices: priceSnapshot.source,
    },
    summary: {
      overallRisk: newsIndex.overallRisk,
      overallRecommendation,
      newsArticles: newsSnapshot.articles.length,
      trackedMarkets: priceSnapshot.markets.length,
      priceTrend: globalTrend,
      narrative: dominantRiskCountry
        ? `${dominantRiskCountry.country} carries the strongest risk signal while the overall fertilizer market is trending ${globalTrend}.`
        : newsSnapshot.articles.length === 0 && priceSnapshot.markets.length
        ? `Price benchmarks are live, but geopolitical news signals are currently unavailable, so recommendations are based on price momentum only.`
        : `Market intelligence is available with ${newsSnapshot.articles.length} news articles and ${priceSnapshot.markets.length} tracked benchmarks.`,
    },
    countries,
    insights,
    news: newsSnapshot.articles.map((item) => ({
      title: item.title,
      country: item.country,
      countries: item.countries,
      riskLevel: item.riskLevel,
      keywords: item.keywords,
      source: item.source,
      publishedAt: item.publishedAt,
      description: item.description,
      url: item.url,
    })),
    prices: priceSnapshot.markets.map((item) => ({
      country: item.country,
      price: item.price,
      history: item.history,
      commodity: item.commodity,
      unit: item.unit,
      source: item.source,
      trend: item.trend,
      changePercent: item.changePercent,
    })),
    timeSeries: priceSnapshot.timeSeries,
    updatedAt: {
      news: newsSnapshot.updatedAt,
      prices: priceSnapshot.updatedAt,
    },
  };
}

module.exports = {
  getMarketNews,
  getMarketPrices,
  getMarketAnalysis,
};
