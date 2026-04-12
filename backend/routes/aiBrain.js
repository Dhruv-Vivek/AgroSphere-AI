const express = require("express");
const {
  loadCropThresholds,
  getDemoFarmState,
  getCachedDemoDecision,
  runBrainAnalysis,
  getAiAnswer,
  summarizeFarmForChat,
} = require("../services/decisionEngine");
const { setLastBrainDecision } = require("../services/farmRuntimeState");

const router = express.Router();

/** @type {Map<string, Array<{ at: string, farmId: string, summary: string, source: string, decision: object }>>} */
const decisionLogs = new Map();

/** @type {Map<string, object>} last full decision per farm */
const lastDecisions = new Map();

const MAX_LOG = 40;

function pushLog(farmId, entry) {
  const list = decisionLogs.get(farmId) || [];
  list.unshift(entry);
  decisionLogs.set(farmId, list.slice(0, MAX_LOG));
}

function mergeFarm(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  return {
    ...base,
    ...patch,
    zones: Array.isArray(patch.zones) ? patch.zones : base.zones,
  };
}

/** GET /api/ai/demo-farm — sample multi-zone farm (no DB). */
router.get("/demo-farm", (req, res) => {
  res.json({ ok: true, data: getDemoFarmState() });
});

/** GET /api/ai/thresholds — crop reference JSON. */
router.get("/thresholds", (req, res) => {
  res.json({ ok: true, data: loadCropThresholds() });
});

/** POST /api/ai/analyze/:farmId — Groq decision JSON (cached demo if no key). */
router.post("/analyze/:farmId", async (req, res) => {
  const farmId = String(req.params.farmId || "demo").trim() || "demo";
  try {
    let farm = getDemoFarmState();
    if (farmId !== "demo" && req.body?.farm && typeof req.body.farm === "object") {
      farm = { ...req.body.farm, farm_id: farmId };
    } else if (req.body?.farm && typeof req.body.farm === "object") {
      farm = mergeFarm(farm, req.body.farm);
      farm.farm_id = farmId;
    }

    const thresholds = loadCropThresholds();
    const { decision, source } = await runBrainAnalysis({ farm, thresholds });

    lastDecisions.set(farmId, decision);
    setLastBrainDecision(farmId, decision);
    const summary = decision?.farm_summary?.top_priority_action || "Analysis complete";
    pushLog(farmId, {
      at: new Date().toISOString(),
      farmId,
      summary,
      source,
      decision,
    });

    return res.json({
      ok: true,
      farmId,
      source,
      used_live_ai: source === "groq" || source === "gemini",
      message:
        source === "cached"
          ? "Using built-in cached decision (set GROQ_API_KEY or GEMINI_API_KEY for live analysis)."
          : undefined,
      data: decision,
    });
  } catch (err) {
    console.error("[aiBrain] analyze:", err.message);
    return res.status(502).json({
      ok: false,
      error: "Brain analysis failed. Try again later.",
      detail: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/** POST /api/ai/ask/:farmId — faster model Q&A. */
router.post("/ask/:farmId", async (req, res) => {
  const farmId = String(req.params.farmId || "demo").trim() || "demo";
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) {
    return res.status(400).json({ ok: false, error: "question is required" });
  }

  try {
    let decision = lastDecisions.get(farmId);
    if (!decision?.farm_summary) {
      decision = getCachedDemoDecision();
    }
    const farmSummary = summarizeFarmForChat(decision);

    const { reply, source } = await getAiAnswer({ farmSummary, question });
    return res.json({ ok: true, farmId, source, reply });
  } catch (err) {
    console.error("[aiBrain] ask:", err.message);
    return res.status(502).json({
      ok: false,
      error: "Could not get AI answer.",
      detail: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/** GET /api/ai/decisions/:farmId */
router.get("/decisions/:farmId", (req, res) => {
  const farmId = String(req.params.farmId || "demo").trim() || "demo";
  const entries = decisionLogs.get(farmId) || [];
  res.json({ ok: true, farmId, count: entries.length, data: entries });
});

/** GET /api/ai/alerts/:farmId — flatten latest zone alerts. */
router.get("/alerts/:farmId", (req, res) => {
  const farmId = String(req.params.farmId || "demo").trim() || "demo";
  const decision = lastDecisions.get(farmId);
  if (!decision?.zones) {
    return res.json({ ok: true, farmId, data: [] });
  }
  const alerts = [];
  for (const [zoneId, z] of Object.entries(decision.zones)) {
    const list = Array.isArray(z.alerts) ? z.alerts : [];
    for (const msg of list) {
      alerts.push({
        zone_id: zoneId,
        message: msg,
        status: z.status,
        health_score: z.health_score,
      });
    }
  }
  res.json({ ok: true, farmId, data: alerts });
});

module.exports = router;
