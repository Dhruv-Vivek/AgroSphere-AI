import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Bot,
  Globe,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import api from '../api/axios'
import { useMitraChat } from '../context/MitraChatContext'
import { LANG_STORAGE_KEY, MITRA_LANGUAGES } from '../data/chatLanguages'

const BOT_NAME = 'Mitra'
const BOT_TAGLINE = 'Your AgroSphere assistant'

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function createSpeechRecognition() {
  const Ctor = getRecognitionCtor()
  return Ctor ? new Ctor() : null
}

function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

function readStoredLang() {
  try {
    const s = localStorage.getItem(LANG_STORAGE_KEY)
    if (s && MITRA_LANGUAGES.some((l) => l.bcp47 === s)) return s
  } catch {
    /* ignore */
  }
  return 'en-IN'
}

export default function ChatBot() {
  const { pathname } = useLocation()
  const { isOpen, setIsOpen, pendingBoot, clearPendingBoot, bootNonce } = useMitraChat()
  const handledBootNonceRef = useRef(0)
  const [replyLanguage, setReplyLanguage] = useState(readStoredLang)
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [voicePreview, setVoicePreview] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(false)
  const listRef = useRef(null)
  const recRef = useRef(null)

  const setLang = useCallback((bcp47) => {
    setReplyLanguage(bcp47)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, bcp47)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const warm = () => window.speechSynthesis.getVoices()
    warm()
    window.speechSynthesis.onvoiceschanged = warm
  }, [])

  const speakText = useCallback(
    (text, langOverride) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return
      const lang = langOverride || replyLanguage
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang
      u.rate = 0.9
      u.pitch = 1
      const voices = window.speechSynthesis.getVoices()
      const base = lang.split('-')[0].toLowerCase()
      const norm = (l) => (l || '').replace('_', '-').toLowerCase()
      const voice =
        voices.find((v) => norm(v.lang) === norm(lang)) ||
        voices.find((v) => norm(v.lang).startsWith(`${base}-`)) ||
        voices.find((v) => norm(v.lang).startsWith(base)) ||
        voices.find((v) => norm(v.lang).startsWith('en'))
      if (voice) u.voice = voice
      window.speechSynthesis.speak(u)
    },
    [replyLanguage]
  )

  const suggestions = useMemo(() => {
    if (pathname.startsWith('/schemes')) {
      return [
        'How do I apply for PM-KISAN step by step?',
        'What documents do I need for PMFBY crop insurance?',
        'Where do I apply for a Kisan Credit Card?',
      ]
    }
    if (pathname.startsWith('/storage')) {
      return [
        'How do I pick cold storage for tomatoes?',
        'What affects shelf life in cold storage?',
      ]
    }
    if (pathname.startsWith('/traceability')) {
      return ['What is a trace ID and how do I share it with buyers?']
    }
    return [
      'How can you help me apply for government schemes?',
      'What documents are usually needed for farm schemes in India?',
      'Give me cold storage tips for vegetables.',
    ]
  }, [pathname])

  const apiContext = useMemo(
    () => ({
      route: pathname,
      app: 'AgroSphere AI',
      assistant: BOT_NAME,
      replyLanguage,
      focus: pathname.startsWith('/schemes')
        ? 'government_scheme_application_guidance'
        : pathname.startsWith('/storage')
          ? 'cold_storage_and_shelf_life'
          : 'general',
    }),
    [pathname, replyLanguage]
  )

  useEffect(() => {
    return () => {
      stopSpeaking()
      try {
        recRef.current?.stop?.()
        recRef.current?.abort?.()
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isOpen])

  const sendMessage = useCallback(
    async (rawText, { fromVoice } = {}) => {
      const text = String(rawText || '').trim()
      if (!text || sending) return

      setInput('')
      setMessages((prev) => [...prev, { role: 'user', content: text }])
      setSending(true)

      try {
        const { data } = await api.post('/chatbot/chat', {
          message: text,
          sessionId,
          context: apiContext,
        })
        setSessionId(data.sessionId)
        const reply = data.reply
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        if (autoSpeak || fromVoice) speakText(reply)
      } catch (err) {
        const msg = err.userMessage || err.message || 'Could not reach assistant'
        toast.error(msg)
        const fallback =
          'Sorry — I could not reach the server. Is the backend running on port 5000?'
        setMessages((prev) => [...prev, { role: 'assistant', content: fallback }])
      } finally {
        setSending(false)
      }
    },
    [sending, sessionId, apiContext, autoSpeak, speakText]
  )

  useEffect(() => {
    if (!isOpen || !pendingBoot || bootNonce === 0) return
    if (handledBootNonceRef.current === bootNonce) return
    handledBootNonceRef.current = bootNonce
    const msg = pendingBoot
    clearPendingBoot()
    sendMessage(msg)
  }, [isOpen, pendingBoot, bootNonce, clearPendingBoot, sendMessage])

  const send = useCallback(() => {
    sendMessage(input)
  }, [input, sendMessage])

  const toggleListen = useCallback(() => {
    if (!getRecognitionCtor()) {
      toast.error('Voice input needs Chrome or Edge (Web Speech API).')
      return
    }

    if (listening) {
      try {
        recRef.current?.stop?.()
      } catch {
        /* ignore */
      }
      setListening(false)
      setVoicePreview('')
      recRef.current = null
      return
    }

    const rec = createSpeechRecognition()
    if (!rec) return
    rec.lang = replyLanguage
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    rec.onstart = () => {
      setListening(true)
      setVoicePreview('')
    }
    rec.onerror = (e) => {
      console.warn('[speech]', e.error)
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        toast.error(e.error === 'not-allowed' ? 'Microphone permission denied' : 'Voice capture failed')
      }
      setListening(false)
      setVoicePreview('')
      recRef.current = null
    }
    rec.onend = () => {
      setListening(false)
      setVoicePreview('')
      recRef.current = null
    }
    rec.onresult = (event) => {
      let interim = ''
      let newFinal = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) newFinal += r[0].transcript
        else interim += r[0].transcript
      }
      if (newFinal.trim()) {
        setVoicePreview('')
        const t = newFinal.trim()
        setInput(t)
        sendMessage(t, { fromVoice: true })
      } else {
        setVoicePreview(interim.trim())
      }
    }

    recRef.current = rec
    try {
      rec.start()
    } catch {
      toast.error('Could not start microphone')
      setListening(false)
    }
  }, [listening, replyLanguage, sendMessage])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto flex max-w-[min(19rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-gray-100 bg-white py-2.5 pl-2.5 pr-3 text-left shadow-lg ring-1 ring-black/5 transition hover:shadow-xl hover:ring-green-600/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          aria-label={`Chat with ${BOT_NAME}`}
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 text-white shadow-inner">
            <Bot className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 shadow">
              AI
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-bold text-gray-800">
              Hi! I&apos;m {BOT_NAME}
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">How can I help you today?</span>
          </span>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-md transition group-hover:bg-green-700">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </span>
        </button>
      )}

      {isOpen && (
        <section
          className="pointer-events-auto flex h-[min(36rem,calc(100dvh-5rem))] w-[min(100vw-1.5rem,23.5rem)] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-green-900/10"
          aria-label={`${BOT_NAME} chat`}
        >
          <header className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-green-900 px-4 py-4 text-white">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-green-500/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-6 left-4 h-16 w-16 rounded-full bg-emerald-400/10 blur-xl" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-700 shadow-lg ring-2 ring-white/20">
                  <Bot className="h-6 w-6 text-white" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold tracking-tight">{BOT_NAME}</p>
                  <p className="truncate text-xs text-green-100/90">{BOT_TAGLINE}</p>
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-gray-300">
                    <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="sr-only">Reply language</span>
                    <select
                      value={replyLanguage}
                      onChange={(e) => setLang(e.target.value)}
                      className="max-w-full flex-1 cursor-pointer rounded-lg border border-white/25 bg-black/25 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-green-400"
                    >
                      {MITRA_LANGUAGES.map((l) => (
                        <option key={l.bcp47} value={l.bcp47}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAutoSpeak((v) => !v)
                      if (autoSpeak) stopSpeaking()
                    }}
                    className="rounded-xl p-2 text-gray-300 transition hover:bg-white/10 hover:text-white"
                    aria-label={autoSpeak ? 'Disable read-aloud' : 'Enable read-aloud'}
                    title="Read replies aloud"
                  >
                    {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl p-2 text-gray-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                    aria-label="Close chat"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            <p className="relative mt-2 text-[10px] leading-snug text-gray-500">
              Voice &amp; replies use your language where the browser supports it. Mic shows live captions
              while you speak.
            </p>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-3"
            role="log"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex gap-2 rounded-xl border border-green-100 bg-white p-3 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">
                    I can walk you through <strong className="text-gray-800">government scheme</strong>{' '}
                    applications (documents, official portals, CSCs),{' '}
                    <strong className="text-gray-800">cold storage</strong>, and traceability. Choose your
                    language above, then type, tap a suggestion, or use the mic.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={sending}
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-green-800 shadow-sm transition hover:border-green-400 hover:bg-green-50 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {m.role === 'assistant' && (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-sm">
                    <Bot className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </div>
                )}
                <div
                  className={`relative max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-100 bg-white pr-10 text-gray-800'
                  }`}
                >
                  {m.content}
                  {m.role === 'assistant' && (
                    <button
                      type="button"
                      className="absolute right-1.5 top-1.5 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-green-600"
                      aria-label="Read this message aloud"
                      onClick={() => speakText(m.content)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-200">
                  <Bot className="h-4 w-4 text-gray-500" aria-hidden />
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-500">
                  <span className="inline-flex gap-1">
                    <span className="animate-pulse">Thinking</span>
                    <span className="animate-pulse delay-75">.</span>
                    <span className="animate-pulse delay-150">.</span>
                    <span className="animate-pulse delay-200">.</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <footer className="border-t border-gray-100 bg-white/95 p-3 backdrop-blur">
            {(listening || voicePreview) && (
              <div className="mb-2 flex gap-2 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/80 px-3 py-2 shadow-sm">
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${listening ? 'animate-pulse bg-red-500' : 'bg-amber-400'}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    {listening ? 'Listening — speak now' : 'Voice'}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-950">
                    {voicePreview || (listening ? '…' : '')}
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={`Message ${BOT_NAME}…`}
                className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-green-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
                disabled={sending || listening}
              />
              <div className="flex shrink-0 flex-col gap-1.5 self-end">
                <button
                  type="button"
                  onClick={toggleListen}
                  disabled={sending}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                    listening
                      ? 'border-red-400 bg-red-50 text-red-600 ring-2 ring-red-200'
                      : 'border-gray-200 bg-white text-green-600 hover:bg-green-50'
                  }`}
                  aria-label={listening ? 'Stop recording' : 'Speak your question'}
                  title="Voice (live caption)"
                >
                  {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !input.trim() || listening}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-white shadow-md transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              Mic language follows the selector · Tap mic again to cancel · Read-aloud picks a matching
              voice when available
            </p>
          </footer>
        </section>
      )}

      {isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 sm:hidden"
          aria-label="Close assistant"
        >
          <X className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
