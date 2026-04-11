import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const MitraChatContext = createContext(null)

/**
 * Lets any page open Mitra and optionally auto-send a first message (no typing).
 * bootNonce avoids duplicate sends under React Strict Mode.
 */
export function MitraChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingBoot, setPendingBoot] = useState(null)
  const [bootNonce, setBootNonce] = useState(0)

  const openMitra = useCallback((opts = {}) => {
    const m = opts.autoMessage?.trim()
    setPendingBoot(m || null)
    if (m) setBootNonce((n) => n + 1)
    setIsOpen(true)
  }, [])

  const clearPendingBoot = useCallback(() => setPendingBoot(null), [])

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      openMitra,
      pendingBoot,
      clearPendingBoot,
      bootNonce,
    }),
    [isOpen, openMitra, pendingBoot, clearPendingBoot, bootNonce]
  )

  return <MitraChatContext.Provider value={value}>{children}</MitraChatContext.Provider>
}

export function useMitraChat() {
  const ctx = useContext(MitraChatContext)
  if (!ctx) {
    throw new Error('useMitraChat must be used inside MitraChatProvider')
  }
  return ctx
}
