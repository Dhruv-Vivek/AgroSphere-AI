import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ApiStatusContext = createContext(null)

export function ApiStatusProvider({ children }) {
  const [apiStatus, setApiStatus] = useState({ groq: false, gemini: false, checked: false })

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/health')
      const data = await res.json()
      const status = {
        groq: Boolean(data?.apis?.groq),
        gemini: Boolean(data?.apis?.gemini),
        checked: true,
      }
      setApiStatus(status)
      console.log('[API Status]', status)
    } catch {
      console.warn('[Health check failed] Backend may not be running')
      setApiStatus({ groq: false, gemini: false, checked: true })
    }
  }, [])

  const value = useMemo(() => ({ apiStatus, setApiStatus, checkHealth }), [apiStatus, checkHealth])

  return <ApiStatusContext.Provider value={value}>{children}</ApiStatusContext.Provider>
}

export function useApiStatus() {
  const ctx = useContext(ApiStatusContext)
  if (!ctx) {
    throw new Error('useApiStatus must be used inside ApiStatusProvider')
  }
  return ctx
}
