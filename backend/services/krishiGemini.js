const axios = require("axios");

const CHAT_MODEL =
  process.env.GEMINI_CHAT_MODEL?.trim() ||
  process.env.GEMINI_DISEASE_MODEL?.trim() ||
  "gemini-2.0-flash-lite";

const KRISHI_SYSTEM_CORE = `You are Krishi (कृषि), the AI farm advisor built into AgroSphere — an intelligent farm management system used by Indian farmers. You are knowledgeable, practical, and speak like a trusted agronomist who also understands rural Indian farming realities.

== YOUR IDENTITY ==
- Name: Krishi (कृषि)
- Role: AI farm advisor for AgroSphere
- Personality: Warm, direct, practical. Never condescending. Treat the farmer as the expert of their own land — you provide data-backed guidance, they make the final call.
- Language: Detect the farmer's language automatically. If they write in Kannada, Hindi, Telugu, Tamil, or any Indian language — respond in that same language. Default: English.

== WHAT YOU KNOW ==
You always receive a JSON block called <farm_context> in your instructions. It contains farm name, acreage, location, zones with crops and sensor readings, alerts, borewell, and last AI brain summary when available.

You MUST use this context to give specific, accurate, personalized answers.
NEVER give generic advice when zone-specific data is available.
Never say "I don't have access to your farm data" — the context is injected.

== CAPABILITIES (summary) ==
Zone status Q&A; irrigation advisor (moisture vs stage, borewell, timing); soil health in plain language vs crop optima; alert interpreter; fertilizer planner; yield forecaster (always mention at least one risk); harvest timing; disease risk when moisture>75% and temp>33°C or drought patterns; weekly 5-point summary on request; multi-turn memory from chat history.

== RESPONSE FORMAT ==
- Keep responses under 150 words unless the farmer asks for a detailed plan
- Use simple numbered or bulleted lists for action steps (max 4 steps)
- Lead with the direct answer, then the reasoning
- End action-oriented responses with one clear "next step" sentence
- For urgent alerts: start with "⚠️ Urgent:" when applicable
- For good news: you may start with "✓" when applicable

== WHAT YOU NEVER DO ==
- Never recommend expensive inputs without checking if simpler fixes work first
- Never use unexplained jargon
- Never make the farmer feel judged
- Never give a yield estimate without mentioning at least one risk factor

You may still briefly help with government schemes, cold storage, or traceability when asked, but prioritize farm operations from <farm_context>.`;

function getGeminiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    ""
  );
}

function stripJsonFence(text) {
  let t = String(text || "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return t.trim();
}

/**
 * Structured farm-brain JSON (same contract as Groq) via Gemini.
 * @param {string} systemPrompt
 * @param {string} userPayloadText — JSON string of { farm, crop_thresholds }
 * @returns {Promise<{ decision: object|null, error: string|null }>}
 */
async function farmBrainAnalysisGemini(systemPrompt, userPayloadText) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return { decision: null, error: "no_gemini_key" };
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/${CHAT_MODEL}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Analyze and respond with ONLY a JSON object per your system instructions (no markdown):\n\n" +
              userPayloadText,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  try {
    const { data } = await axios.post(url, body, {
      params: { key: apiKey },
      headers: { "Content-Type": "application/json" },
      timeout: 90000,
    });

    const raw =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    if (!raw) {
      return { decision: null, error: "empty_gemini_response" };
    }

    const decision = JSON.parse(stripJsonFence(raw));
    if (!decision?.farm_summary || !decision?.zones) {
      return { decision: null, error: "invalid_decision_shape" };
    }
    return { decision, error: null };
  } catch (err) {
    const msg =
      err.response?.data?.error?.message || err.response?.data?.message || err.message;
    console.error("[farmBrainAnalysisGemini]", msg);
    return { decision: null, error: msg || "gemini_failed" };
  }
}

/**
 * AI Brain panel Q&A when Groq is not configured.
 * @param {{ farmSummary: string, question: string }} opts
 */
async function askFarmBrainGemini(opts) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return { reply: null, error: "no_gemini_key" };
  }

  const system =
    "You are AgroSphere's farm brain Q&A. Use the farm summary (zones, moisture, alerts). " +
    "Answer concisely for Indian farmers (under 400 words). Prefer bullet points when listing actions.";

  const url = `https://generativelanguage.googleapis.com/v1/models/${CHAT_MODEL}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Farm summary:\n${opts.farmSummary}\n\nFarmer question:\n${opts.question}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.45,
      maxOutputTokens: 700,
    },
  };

  try {
    const { data } = await axios.post(url, body, {
      params: { key: apiKey },
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    if (!text) {
      return { reply: null, error: "empty_gemini_response" };
    }
    return { reply: text.trim(), error: null };
  } catch (err) {
    const msg =
      err.response?.data?.error?.message || err.response?.data?.message || err.message;
    console.error("[askFarmBrainGemini]", msg);
    return { reply: null, error: msg || "gemini_failed" };
  }
}

/**
 * @param {{
 *   systemWithContext: string,
 *   contents: Array<{ role: 'user'|'model', parts: Array<{ text: string }> }>,
 * }} opts
 */
async function generateKrishiReply(opts) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return { text: null, error: "GEMINI_API_KEY missing" };
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/${CHAT_MODEL}:generateContent`;

  const body = {
    systemInstruction: {
      parts: [{ text: opts.systemWithContext }],
    },
    contents: opts.contents,
    generationConfig: {
      temperature: 0.45,
      maxOutputTokens: 900,
    },
  };

  try {
    const { data } = await axios.post(url, body, {
      params: { key: apiKey },
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    if (!text) {
      const reason = data?.candidates?.[0]?.finishReason || "empty";
      return { text: null, error: `Gemini returned no text (${reason})` };
    }

    return { text: text.trim(), error: null };
  } catch (err) {
    const msg =
      err.response?.data?.error?.message || err.response?.data?.message || err.message;
    console.error("[krishiGemini]", msg);
    return { text: null, error: msg || "Gemini request failed" };
  }
}

module.exports = {
  KRISHI_SYSTEM_CORE,
  CHAT_MODEL,
  generateKrishiReply,
  getGeminiKey,
  farmBrainAnalysisGemini,
  askFarmBrainGemini,
};