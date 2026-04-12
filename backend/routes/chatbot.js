const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Groq = require('groq-sdk');

const router = express.Router();

/** @type {Map<string, Array<{ role: string, content: string }>>} */
const sessions = new Map();

const DEMO_REPLY =
  'I am Mitra (AgroSphere) in demo mode. Add GROQ_API_KEY to your backend `.env` for full LLM answers. ' +
  'Ask me about crops, cold storage, how to apply for schemes (documents & official portals), or traceability.';

/** Quick replies (unchanged) */
function tryQuickSocialReply(message, context) {
  const t = message.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!t) return null

  const lang = context && typeof context === 'object' ? context.replyLanguage || 'en-IN' : 'en-IN'

  const en = {
    hi: "Hi! I'm Mitra, your AgroSphere assistant. Ask me about government schemes, cold storage, crops, or traceability — whatever you need.",
    morning: 'Good morning! I hope your day in the fields goes well. How can I help?',
    afternoon: 'Good afternoon! What would you like help with?',
    evening: 'Good evening! Tell me what you need.',
    sorry: "No worries at all. What would you like help with next?",
    thanks: "You're very welcome!",
    bye: 'Take care! Come back anytime.',
    ok: 'Great! What would you like to know?',
  }

  const hi = {
    hi: 'नमस्ते! मैं मित्रा हूँ — आपकी एग्रोस्फीयर सहायक।',
    morning: 'सुप्रभात! कैसे मदद करूं?',
    sorry: 'कोई बात नहीं! आगे बताइए।',
    thanks: 'धन्यवाद!',
    bye: 'फिर मिलेंगे!',
    ok: 'ठीक है! आगे बताइए।',
  }

  const pick = lang.startsWith('hi') ? hi : en

  if (/^(hi|hello|hey|hii+|yo)\b|^namaste|^namaskar/.test(t)) return pick.hi
  if (/^good morning|^gm/.test(t)) return pick.morning
  if (/^good afternoon|^ga/.test(t)) return pick.afternoon
  if (/^good evening|^ge/.test(t)) return pick.evening
  if (/sorry|apologies/.test(t)) return pick.sorry
  if (/thank|thanks/.test(t)) return pick.thanks
  if (/^bye|goodbye/.test(t)) return pick.bye
  if (/^(ok|okay|yes|haan)$/.test(t)) return pick.ok

  return null
}

function replyLanguageDirective(context) {
  if (!context || typeof context !== 'object') return '';
  const code = context.replyLanguage || context.language || 'en-IN';
  return code === 'hi-IN'
    ? 'Reply in Hindi (Devanagari).'
    : 'Reply in English (India), simple and farmer-friendly.';
}

router.post('/chat', async (req, res) => {
  const { message, sessionId, context } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const sid = sessionId && sessions.has(sessionId) ? sessionId : uuidv4();
  const history = sessions.get(sid) || [];

  const contextStr =
    context && typeof context === 'object'
      ? JSON.stringify(context)
      : String(context ?? '');

  const systemPrompt = [
    'You are Mitra, AgroSphere AI assistant for farmers in India.',
    replyLanguageDirective(context),
    'Be clear, practical, and helpful.',
    contextStr ? `Context: ${contextStr}` : '',
  ].filter(Boolean).join('\n');

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-12),
    { role: 'user', content: message.trim() },
  ];

  try {
    let reply;

    const quick = tryQuickSocialReply(message, context);

    if (quick) {
      reply = quick;
    } else {
      const groqApiKey = process.env.GROQ_API_KEY;

      // 🔴 DEBUG LOG (safe)
      console.log("GROQ KEY:", groqApiKey ? groqApiKey.slice(0, 8) : "MISSING");

      // ✅ Validate key before using
      if (groqApiKey && groqApiKey.startsWith("gsk_")) {
        const groq = new Groq({ apiKey: groqApiKey });

        const completion = await groq.chat.completions.create({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          messages: apiMessages,
          max_tokens: 600,
          temperature: 0.6,
        });

        reply =
          completion.choices[0]?.message?.content?.trim() ||
          'No reply generated.';
      } else {
        console.log("❌ Invalid or missing GROQ API key");
        reply = `${DEMO_REPLY}\n\nYou said: "${message.trim()}"`;
      }
    }

    history.push({ role: 'user', content: message.trim() });
    history.push({ role: 'assistant', content: reply });
    sessions.set(sid, history);

    return res.json({ reply, sessionId: sid });

  } catch (err) {
    console.error('[chatbot ERROR]', err.response?.data || err.message);

    return res.status(500).json({
      message: err.response?.data?.error?.message || err.message || 'Chat failed',
    });
  }
});

module.exports = router;
