const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Groq = require('groq-sdk');

const router = express.Router();

/** @type {Map<string, Array<{ role: string, content: string }>>} */
const sessions = new Map();

const DEMO_REPLY =
  'I am Mitra (AgroSphere) in demo mode. Add GROQ_API_KEY to your backend `.env` for full LLM answers. ' +
  'Ask me about crops, cold storage, how to apply for schemes (documents & official portals), or traceability.';

/** Short, friendly replies without calling the LLM (works in demo mode too). */
function tryQuickSocialReply(message, context) {
  const t = message.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!t) return null

  const lang = context && typeof context === 'object' ? context.replyLanguage || 'en-IN' : 'en-IN'

  const en = {
    hi: "Hi! I'm Mitra, your AgroSphere assistant. Ask me about government schemes, cold storage, crops, or traceability — whatever you need.",
    morning:
      'Good morning! I hope your day in the fields goes well. How can I help — schemes, storage, or crop advice?',
    afternoon: 'Good afternoon! What would you like help with on AgroSphere today?',
    evening: 'Good evening! Tell me what you need — I can guide you on schemes, storage, or farming tips.',
    sorry:
      "No worries at all — that's okay. What would you like help with next?",
    thanks:
      "You're very welcome! If you think of anything else about schemes or storage, I'm here.",
    bye: 'Take care, and good luck with the season. Come back anytime!',
    ok: 'Great! What would you like to know?',
  }

  const hi = {
    hi: 'नमस्ते! मैं मित्रा हूँ — आपकी एग्रोस्फीयर सहायक। योजनाओं, कोल्ड स्टोरेज या फसलों के बारे में पूछें।',
    morning: 'सुप्रभात! आज मैं आपकी किस चीज़ में मदद कर सकती हूँ?',
    sorry: 'कोई बात नहीं! आगे किसमें मदद चाहिए?',
    thanks: 'आपका धन्यवाद! और कुछ पूछना हो तो बताइए।',
    bye: 'फिर मिलेंगे! अच्छे रहिए।',
    ok: 'ठीक है! आगे क्या जानना है?',
  }

  const pick = lang.startsWith('hi') ? hi : en

  if (/^(hi|hello|hey|hii+|yo)\b|^namaste|^namaskar|^vanakkam|^salaam|^assalam/.test(t)) {
    return pick.hi
  }
  if (/^good morning\b|^gm\b/.test(t)) return pick.morning
  if (/^good afternoon\b|^ga\b/.test(t)) return pick.afternoon
  if (/^good evening\b|^ge\b/.test(t)) return pick.evening
  if (/^sorry\b|^my bad\b|^apologies\b|^pardon\b|^forgive/.test(t)) return pick.sorry
  if (/thank|thanks|dhanyavaad|shukriya|nandri|ధన్యవాదాలు|நன்றி/.test(t)) return pick.thanks
  if (/^bye\b|^goodbye|^see you/.test(t)) return pick.bye
  if (/^(ok|okay|yes|yeah|yep|haan|ha)\b$/.test(t)) return pick.ok

  return null
}

function replyLanguageDirective(context) {
  if (!context || typeof context !== 'object') return '';
  const code = context.replyLanguage || context.language || 'en-IN';
  const map = {
    'en-IN':
      'Reply in English (India). Keep sentences short and farmer-friendly.',
    'hi-IN':
      'Reply primarily in Hindi using Devanagari script. You may keep well-known scheme names in English (e.g. PM-KISAN, PMFBY) when helpful.',
    'ta-IN':
      'Reply primarily in Tamil (Tamil script). Keep official scheme names in English/Latin where usual.',
    'te-IN': 'Reply primarily in Telugu (Telugu script).',
    'kn-IN': 'Reply primarily in Kannada (Kannada script).',
    'ml-IN': 'Reply primarily in Malayalam (Malayalam script).',
    'mr-IN': 'Reply primarily in Marathi (Devanagari).',
    'bn-IN': 'Reply primarily in Bengali (Bengali script).',
  };
  return map[code] || map['en-IN'];
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

  const langLine =
    context && typeof context === 'object' ? replyLanguageDirective(context) : '';

  const schemeHelp = [
    'Government schemes (PM-KISAN, PMFBY, KCC, Soil Health Card, state schemes):',
    '- Help users understand eligibility and documents in simple language.',
    '- For applying: give numbered steps — verify eligibility, collect documents (Aadhaar, land records, bank passbook, etc.), apply only on official .gov.in portals or via authorised CSC / bank branches / agriculture department offices.',
    '- Warn: never pay middlemen for "guaranteed" scheme approval; avoid unofficial links.',
    '- You cannot fill or submit forms on behalf of the user; guide them step by step and suggest they confirm details on the official portal.',
    '- If the user is on the Schemes page in the app, mention they can use "Apply Now" on scheme cards for official links.',
  ].join('\n');

  const systemPrompt = [
    'You are Mitra, the AgroSphere AI assistant for farmers and agri-stakeholders in India. Be warm, clear, and concise.',
    'Always reply naturally to short greetings (hi, hello, good morning, sorry, thanks, bye) in one or two friendly sentences before offering help.',
    langLine,
    'Give practical, safe, non-medical advice about farming, cold storage, markets, traceability, and sustainability.',
    schemeHelp,
    'If unsure, say you are not sure and suggest consulting local extension officers or the official helpline.',
    contextStr ? `App context (JSON or text): ${contextStr}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

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
    } else if (process.env.GROQ_API_KEY) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
      const completion = await groq.chat.completions.create({
        model,
        messages: apiMessages,
        max_tokens: 600,
        temperature: 0.6,
      });
      reply = completion.choices[0]?.message?.content?.trim() || 'No reply generated.';
    } else {
      reply = `${DEMO_REPLY}\n\nYou said: “${message.trim()}”`;
    }

    history.push({ role: 'user', content: message.trim() });
    history.push({ role: 'assistant', content: reply });
    sessions.set(sid, history);

    return res.json({ reply, sessionId: sid });
  } catch (err) {
    console.error('[chatbot]', err);
    return res.status(500).json({
      message: err.message || 'Chat request failed',
    });
  }
});

module.exports = router;
