const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const {
  getGeminiKey,
  farmBrainAnalysisGemini,
  askFarmBrainGemini,
} = require("./krishiGemini");

const THRESHOLDS_PATH = path.join(__dirname, "..", "data", "crop_thresholds.json");

const DECISION_MODEL = process.env.GROQ_DECISION_MODEL || "llama-3.3-70b-versatile";
const CHAT_MODEL = process.env.GROQ_BRAIN_CHAT_MODEL || "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are AgroSphere's agricultural AI brain managing a real farm in India.
You receive JSON with farm zones, latest sensor-style readings, and crop threshold reference data.
Respond ONLY with a valid JSON object (no markdown, no backticks, no explanation).

Schema:
{
  "zones": {
    "<zone_id>": {
      "health_score": 0-100,
      "status": "optimal|warning|critical",
      "alerts": ["string"],
      "irrigation": {
        "should_irrigate": boolean,
        "next_schedule": "ISO datetime string or null",
        "duration_minutes": number,
        "flow_rate_lpm": number,
        "reasoning": "string"
      },
      "care_tasks": [
        {
          "task_type": "fertilizer|pesticide|weeding|soil_amendment",
          "description": "string",
          "priority": "high|medium|low",
          "due_date": "ISO date",
          "quantity": "string"
        }
      ],
      "yield_forecast": {
        "expected_kg_per_acre": number,
        "confidence": 0-1,
        "risk_factors": ["string"],
        "positive_factors": ["string"]
      },
      "growth_stage_assessment": "string"
    }
  },
  "farm_summary": {
    "overall_health": 0-100,
    "critical_alerts_count": number,
    "borewell_recommendation": "run|idle|maintenance",
    "weekly_water_budget_kl": number,
    "top_priority_action": "string"
  }
}

Include every zone_id from the input farm.zones. Use realistic numbers for India.`;

function loadCropThresholds() {
  try {
    const raw = fs.readFileSync(THRESHOLDS_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("[decisionEngine] thresholds:", e.message);
    return {};
  }
}

/** Demo farm aligned with hackathon seed narrative (no DB). */
function getDemoFarmState() {
  return {
    farm_id: "demo",
    farm_name: "Sharma Farm",
    total_acres: 20,
    borewell: {
      depth_ft: 400,
      motor_hp: 7.5,
      flow_rate_lpm: 180,
      water_table_m: 12,
      status: "idle",
      motor_on: false,
    },
    zones: [
      {
        id: "A",
        label: "Zone A",
        crop: "maize",
        acres: 5,
        days_since_sowing: 45,
        growth_stage: "vegetative",
        soil: { ph: 6.4, moisture_pct: 52, organic_matter_pct: 2.1, N: 118, P: 48, K: 72 },
        last_irrigation_hours_ago: 96,
        sensors: { temp_c: 31, humidity_pct: 54 },
      },
      {
        id: "B",
        label: "Zone B",
        crop: "wheat",
        acres: 5,
        days_since_sowing: 30,
        growth_stage: "vegetative",
        soil: { ph: 6.8, moisture_pct: 44, organic_matter_pct: 1.8, N: 95, P: 42, K: 48 },
        last_irrigation_hours_ago: 120,
        sensors: { temp_c: 24, humidity_pct: 62 },
      },
      {
        id: "C",
        label: "Zone C",
        crop: "tomato",
        acres: 5,
        days_since_sowing: 60,
        growth_stage: "flowering",
        soil: { ph: 6.2, moisture_pct: 28, organic_matter_pct: 2.4, N: 88, P: 55, K: 110 },
        last_irrigation_hours_ago: 36,
        sensors: { temp_c: 34, humidity_pct: 48 },
      },
      {
        id: "D",
        label: "Zone D",
        crop: "rice",
        acres: 5,
        days_since_sowing: 20,
        growth_stage: "germination",
        soil: { ph: 5.9, moisture_pct: 82, organic_matter_pct: 2.0, N: 72, P: 35, K: 38 },
        last_irrigation_hours_ago: 12,
        sensors: { temp_c: 29, humidity_pct: 78 },
      },
    ],
  };
}

function getCachedDemoDecision() {
  const now = new Date();
  const iso = (d) => d.toISOString();
  return {
    zones: {
      A: {
        health_score: 78,
        status: "warning",
        alerts: ["Soil moisture trending low before tasseling — monitor closely."],
        irrigation: {
          should_irrigate: true,
          next_schedule: iso(new Date(now.getTime() + 18 * 3600 * 1000)),
          duration_minutes: 90,
          flow_rate_lpm: 180,
          reasoning: "Moisture 52% vs vegetative target ~55–65% for maize; light irrigation advised.",
        },
        care_tasks: [
          {
            task_type: "fertilizer",
            description: "Top-dress nitrogen as per soil test",
            priority: "medium",
            due_date: iso(new Date(now.getTime() + 3 * 86400 * 1000)).slice(0, 10),
            quantity: "Urea 45 kg/acre (split dose) — confirm with local KVK",
          },
        ],
        yield_forecast: {
          expected_kg_per_acre: 3200,
          confidence: 0.72,
          risk_factors: ["Heat stress if moisture dips further"],
          positive_factors: ["pH in range", "NPK near target"],
        },
        growth_stage_assessment: "Vegetative phase on track; maintain moisture for uniform cob fill.",
      },
      B: {
        health_score: 82,
        status: "optimal",
        alerts: [],
        irrigation: {
          should_irrigate: false,
          next_schedule: iso(new Date(now.getTime() + 48 * 3600 * 1000)),
          duration_minutes: 60,
          flow_rate_lpm: 180,
          reasoning: "Moisture adequate for wheat vegetative stage.",
        },
        care_tasks: [],
        yield_forecast: {
          expected_kg_per_acre: 3000,
          confidence: 0.68,
          risk_factors: [],
          positive_factors: ["Stable temps", "Good humidity"],
        },
        growth_stage_assessment: "Early vegetative — continue current irrigation rhythm.",
      },
      C: {
        health_score: 42,
        status: "critical",
        alerts: [
          "CRITICAL: Low soil moisture (28%) during flowering — drought stress risk.",
          "Flower drop risk elevated until moisture restored.",
        ],
        irrigation: {
          should_irrigate: true,
          next_schedule: iso(new Date(now.getTime() + 2 * 3600 * 1000)),
          duration_minutes: 120,
          flow_rate_lpm: 180,
          reasoning: "Flowering tomato needs >55% moisture; immediate irrigation recommended.",
        },
        care_tasks: [
          {
            task_type: "soil_amendment",
            description: "Mulch beds to reduce evaporation after irrigation",
            priority: "high",
            due_date: iso(new Date(now.getTime() + 86400 * 1000)).slice(0, 10),
            quantity: "Organic mulch 4–6 t/ha equivalent",
          },
        ],
        yield_forecast: {
          expected_kg_per_acre: 14000,
          confidence: 0.55,
          risk_factors: ["Moisture stress during flowering", "High day temperature"],
          positive_factors: ["Strong K levels"],
        },
        growth_stage_assessment: "Flowering under stress — prioritize water before nutrition top-ups.",
      },
      D: {
        health_score: 88,
        status: "optimal",
        alerts: [],
        irrigation: {
          should_irrigate: true,
          next_schedule: iso(new Date(now.getTime() + 8 * 3600 * 1000)),
          duration_minutes: 45,
          flow_rate_lpm: 180,
          reasoning: "Puddled rice — maintain standing water per stage.",
        },
        care_tasks: [],
        yield_forecast: {
          expected_kg_per_acre: 3100,
          confidence: 0.7,
          risk_factors: [],
          positive_factors: ["High moisture appropriate for germination"],
        },
        growth_stage_assessment: "Germination / early establishment looks favourable.",
      },
    },
    farm_summary: {
      overall_health: 72,
      critical_alerts_count: 2,
      borewell_recommendation: "run",
      weekly_water_budget_kl: 420,
      top_priority_action: "Irrigate Zone C (tomato) within hours; flowering moisture is critically low.",
    },
  };
}

function stripJson(text) {
  if (!text || typeof text !== "string") return "{}";
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return t.trim();
}

/**
 * @param {{ farm: object, thresholds?: object }} opts
 * @returns {Promise<{ decision: object, source: 'groq'|'gemini'|'cached' }>}
 */
async function runBrainAnalysis(opts) {
  const farm = opts.farm && typeof opts.farm === "object" ? opts.farm : getDemoFarmState();
  const thresholds = opts.thresholds ?? loadCropThresholds();
  const userPayload = JSON.stringify({ farm, crop_thresholds: thresholds }, null, 0);

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        model: DECISION_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Farm state and thresholds (JSON). Analyze and return ONLY JSON:\n${userPayload}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2048,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      let decision;
      try {
        decision = JSON.parse(stripJson(raw));
      } catch (e) {
        console.error("[decisionEngine] Groq JSON parse failed", e.message);
        throw e;
      }
      if (decision?.farm_summary && decision?.zones) {
        return { decision, source: "groq" };
      }
    } catch (e) {
      console.error("[decisionEngine] Groq brain failed, trying Gemini:", e.message);
    }
  }

  if (getGeminiKey()) {
    const { decision, error } = await farmBrainAnalysisGemini(SYSTEM_PROMPT, userPayload);
    if (decision?.farm_summary && decision?.zones) {
      return { decision, source: "gemini" };
    }
    console.error("[decisionEngine] Gemini brain failed:", error);
  }

  return { decision: getCachedDemoDecision(), source: "cached" };
}

/**
 * @param {{ farmSummary: string, question: string }} opts
 */
async function getAiAnswer(opts) {
  const { farmSummary, question } = opts;
  const groqKey = process.env.GROQ_API_KEY?.trim();

  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are AgroSphere's expert farm advisor for India. Give concise, practical answers. " +
              "Current farm context (may be abbreviated):\n" +
              farmSummary,
          },
          { role: "user", content: question },
        ],
        temperature: 0.5,
        max_tokens: 512,
      });
      const reply = completion.choices[0]?.message?.content?.trim() || "No response.";
      return { reply, source: "groq" };
    } catch (e) {
      console.error("[decisionEngine] Groq ask failed, trying Gemini:", e.message);
    }
  }

  if (getGeminiKey()) {
    const { reply, error } = await askFarmBrainGemini({ farmSummary, question });
    if (reply) {
      return { reply, source: "gemini" };
    }
    return {
      reply:
        "Gemini could not answer (" +
        (error || "unknown") +
        "). Cached summary: " +
        farmSummary.slice(0, 400),
      source: "cached",
    };
  }

  return {
    reply:
      "Brain chat is offline. Add GROQ_API_KEY or GEMINI_API_KEY to backend/.env and restart the server. Cached summary: " +
      farmSummary.slice(0, 400),
    source: "cached",
  };
}

function summarizeFarmForChat(decision) {
  if (!decision?.farm_summary) return JSON.stringify(decision || {}).slice(0, 800);
  const z = decision.zones || {};
  const lines = Object.keys(z).map((id) => {
    const r = z[id];
    return `Zone ${id}: health ${r?.health_score}, status ${r?.status}, alerts ${(r?.alerts || []).length}`;
  });
  return (
    `Overall health ${decision.farm_summary.overall_health}. Critical alerts: ${decision.farm_summary.critical_alerts_count}. ` +
    `Priority: ${decision.farm_summary.top_priority_action}. ` +
    lines.join(". ")
  );
}

module.exports = {
  loadCropThresholds,
  getDemoFarmState,
  getCachedDemoDecision,
  runBrainAnalysis,
  getAiAnswer,
  summarizeFarmForChat,
  DECISION_MODEL,
  CHAT_MODEL,
};
