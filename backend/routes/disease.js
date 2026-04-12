const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const axios = require("axios");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const mockPath = path.join(__dirname, "..", "data", "disease_mock.json");

function loadMockResponses() {
  try {
    const raw = fs.readFileSync(mockPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function pickMock() {
  const list = loadMockResponses();
  if (list.length === 0) {
    return {
      is_healthy: false,
      edge_case: "normal",
      results: [
        {
          name: "Unknown stress (mock)",
          confidence: 80,
          description:
            "Could not run vision model and no mock file — placeholder response.",
          treatment:
            "Re-upload a clear leaf photo; ensure good lighting and focus. Add GEMINI_API_KEY to backend .env for free AI analysis (Google AI Studio).",
          affected_crops: [],
          severity: "Low",
          image_symptoms: "N/A",
        },
      ],
    };
  }
  const row = list[Math.floor(Math.random() * list.length)];
  return typeof row === "object" && row !== null && !Array.isArray(row)
    ? { edge_case: "normal", ...row }
    : { edge_case: "normal", is_healthy: false, results: [] };
}

const GEMINI_MODEL =
  process.env.GEMINI_DISEASE_MODEL?.trim() || "gemini-1.5-flash";

const VISION_PROMPT = `You are a plant pathologist assistant for Indian agriculture. Examine the image carefully.

Respond with ONLY a single JSON object (no markdown fences) using this exact schema:
{
  "edge_case": "normal" | "not_a_plant" | "blurry" | "no_leaf_visible" | "multiple_diseases",
  "is_healthy": boolean,
  "results": [
    {
      "name": string,
      "confidence": number,
      "description": string,
      "treatment": string,
      "affected_crops": string[],
      "severity": "Low" | "Medium" | "High",
      "image_symptoms": string
    }
  ]
}

Rules:
- confidence is 0-100 for each disease row.
- image_symptoms: only signs visible in this specific photo.
- treatment: practical agronomic advice for India; prefer ICAR / state extension style names and typical doses (e.g. Copper Oxychloride 50% WP, Mancozeb 75% WP, valid bio-agents like Trichoderma) where appropriate; remind to follow label and local advisory. Not medical advice for humans.
- If the subject is not a plant: edge_case "not_a_plant", is_healthy false, one short result explaining.
- If image is too unclear: edge_case "blurry".
- If plant but no leaf or lesion area visible: edge_case "no_leaf_visible".
- If several clear distinct problems: edge_case "multiple_diseases", up to 3 results ordered by importance.
- If the plant looks healthy with no actionable disease: is_healthy true and results must be [].
- Otherwise edge_case "normal" and 1-3 disease results.`;

function stripJsonFences(text) {
  if (!text || typeof text !== "string") return text;
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return t.trim();
}

function parseGeminiJson(rawText) {
  const cleaned = stripJsonFences(rawText);
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON shape");
  return parsed;
}

router.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      ok: false,
      error: "Missing file field `image`",
      fallback: true,
    });
  }

  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim();

  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      fallback: true,
      error:
        "GEMINI_API_KEY is not set. Add a free key from https://aistudio.google.com/apikey to backend/.env",
    });
  }

  const mime = req.file.mimetype || "image/jpeg";
  const base64 = req.file.buffer.toString("base64");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  try {
    const { data } = await axios.post(
      url,
      {
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: mime, data: base64 } },
              { text: VISION_PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      },
      {
        params: { key: apiKey },
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      const block = data?.candidates?.[0]?.finishReason;
      console.error("disease Gemini: empty text", block, data);
      return res.status(502).json({
        ok: false,
        fallback: true,
        error: "Vision model returned no text. Try another image or check API quota.",
      });
    }

    let vision;
    try {
      vision = parseGeminiJson(text);
    } catch (e) {
      console.error("disease Gemini JSON parse:", e.message, text.slice(0, 500));
      return res.status(502).json({
        ok: false,
        fallback: true,
        error: "Could not parse model response. Try again with a clearer photo.",
      });
    }

    const edge = vision.edge_case || "normal";
    const isHealthy = Boolean(vision.is_healthy);
    let results = Array.isArray(vision.results) ? vision.results : [];

    if (isHealthy) {
      results = [];
    }

    return res.json({
      ok: true,
      fallback: false,
      data: {
        is_healthy: isHealthy,
        edge_case: edge,
        results,
      },
    });
  } catch (err) {
    const msg =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message;
    console.error("disease Gemini:", msg, err.response?.data);
    return res.status(502).json({
      ok: false,
      fallback: true,
      error: msg || "Vision request failed",
    });
  }
});

router.get("/mock", (req, res) => {
  try {
    res.json({ ok: true, data: pickMock(), fallback: true });
  } catch (err) {
    console.error("disease /mock:", err.message);
    res.status(500).json({ ok: false, error: "Mock failed", data: pickMock(), fallback: true });
  }
});

module.exports = router;
