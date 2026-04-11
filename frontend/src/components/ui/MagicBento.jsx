import { useRef, useState, useCallback } from 'react'

/**
 * MagicBento — React Bits style
 * A bento grid where each tile responds to mouse position with a
 * radial spotlight + subtle tilt effect (no external deps).
 *
 * Props:
 *   items: Array<{
 *     id: string
 *     colSpan?: number   (1–3, default 1)
 *     rowSpan?: number   (1–2, default 1)
 *     className?: string (extra classes on the tile)
 *     children: ReactNode
 *   }>
 *   columns?: number  (default 3)
 *   gap?: number      (default 16, in px)
 *   spotlightColor?: string (default 'rgba(16,185,129,0.12)')
 *   tiltDeg?: number  (default 6)
 */
export default function MagicBento({
  items = [],
  columns = 3,
  gap = 16,
  spotlightColor = 'rgba(16,185,129,0.12)',
  tiltDeg = 6,
}) {
  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
      }}
    >
      {items.map((item) => (
        <BentoTile
          key={item.id}
          colSpan={item.colSpan || 1}
          rowSpan={item.rowSpan || 1}
          className={item.className}
          spotlightColor={item.spotlightColor || spotlightColor}
          tiltDeg={tiltDeg}
        >
          {item.children}
        </BentoTile>
      ))}
    </div>
  )
}

/**
 * BentoTile — individual tile with mouse-tracking spotlight + tilt
 * Can also be used standalone.
 */
export function BentoTile({
  children,
  colSpan = 1,
  rowSpan = 1,
  className = '',
  spotlightColor = 'rgba(16,185,129,0.12)',
  tiltDeg = 6,
  style = {},
}) {
  const tileRef = useRef(null)
  const [spotlight, setSpotlight] = useState({ x: '50%', y: '50%', opacity: 0 })
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })
  const rafRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = tileRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const xPct = x / rect.width
      const yPct = y / rect.height

      setSpotlight({
        x: `${(xPct * 100).toFixed(1)}%`,
        y: `${(yPct * 100).toFixed(1)}%`,
        opacity: 1,
      })

      // Tilt: centre = 0, edge = ±tiltDeg
      const rotateY =  (xPct - 0.5) * tiltDeg * 2
      const rotateX = -(yPct - 0.5) * tiltDeg * 2
      setTilt({ rotateX, rotateY })
    })
  }, [tiltDeg])

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setSpotlight((s) => ({ ...s, opacity: 0 }))
    setTilt({ rotateX: 0, rotateY: 0 })
  }, [])

  return (
    <div
      ref={tileRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={[
        'relative overflow-hidden rounded-2xl border border-gray-100 bg-white',
        'shadow-sm ring-1 ring-gray-900/5',
        'transition-shadow duration-200 hover:shadow-md',
        className,
      ].join(' ')}
      style={{
        gridColumn: `span ${colSpan} / span ${colSpan}`,
        gridRow:    `span ${rowSpan} / span ${rowSpan}`,
        transform: `perspective(800px) rotateX(${tilt.rotateX.toFixed(2)}deg) rotateY(${tilt.rotateY.toFixed(2)}deg)`,
        transition: 'transform 0.15s ease, box-shadow 0.2s ease',
        willChange: 'transform',
        ...style,
      }}
    >
      {/* Mouse-tracking spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-2xl transition-opacity duration-300"
        style={{
          background: `radial-gradient(400px circle at ${spotlight.x} ${spotlight.y}, ${spotlightColor}, transparent 70%)`,
          opacity: spotlight.opacity,
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  )
}
