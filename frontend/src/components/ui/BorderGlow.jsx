import { useRef, useState, useCallback, useEffect } from 'react'

/**
 * BorderGlow — React Bits style
 * A card/container whose border glows along a gradient that follows
 * the mouse position around the perimeter of the element.
 *
 * Props:
 *   children: ReactNode
 *   className?: string        (extra classes on the outer wrapper)
 *   innerClassName?: string   (extra classes on the inner content div)
 *   glowColor?: string        (CSS colour, default emerald)
 *   glowSize?: number         (px, default 120)
 *   borderWidth?: number      (px, default 1.5)
 *   borderRadius?: string     (CSS, default '1rem')
 *   animated?: boolean        (auto-animate even without hover, default false)
 *   as?: string               (HTML tag, default 'div')
 *   style?: CSSProperties
 *   [rest]: any               (passed to outer element)
 */
export default function BorderGlow({
  children,
  className = '',
  innerClassName = '',
  glowColor = '#10b981',
  glowSize = 140,
  borderWidth = 1.5,
  borderRadius = '1rem',
  animated = false,
  as: Tag = 'div',
  style = {},
  ...rest
}) {
  const ref = useRef(null)
  const rafRef = useRef(null)
  const angleRef = useRef(0)
  const animRef = useRef(null)

  const [pos, setPos] = useState({ x: '50%', y: '50%' })
  const [hovered, setHovered] = useState(false)

  // Convert hex / named color to rgba for the gradient
  const toRgba = (color, alpha) => {
    // If already rgba/rgb just return
    if (color.startsWith('rgba') || color.startsWith('rgb')) return color
    return color // let CSS handle it — browser resolves it fine in gradients
  }

  const glowStop  = toRgba(glowColor, 1)
  const glowFade  = toRgba(glowColor, 0)

  // Mouse-tracking mode
  const onMouseMove = useCallback((e) => {
    if (animated) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPos({
        x: `${((e.clientX - rect.left) / rect.width * 100).toFixed(1)}%`,
        y: `${((e.clientY - rect.top)  / rect.height * 100).toFixed(1)}%`,
      })
    })
  }, [animated])

  const onMouseEnter = useCallback(() => setHovered(true),  [])
  const onMouseLeave = useCallback(() => setHovered(false), [])

  // Auto-rotate animation mode
  useEffect(() => {
    if (!animated) { cancelAnimationFrame(animRef.current); return }
    const tick = () => {
      angleRef.current = (angleRef.current + 1) % 360
      const rad = (angleRef.current * Math.PI) / 180
      setPos({
        x: `${(50 + 50 * Math.cos(rad)).toFixed(1)}%`,
        y: `${(50 + 50 * Math.sin(rad)).toFixed(1)}%`,
      })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [animated])

  const showGlow = animated || hovered

  const borderGradient = showGlow
    ? `radial-gradient(${glowSize}px circle at ${pos.x} ${pos.y}, ${glowStop}, transparent 70%)`
    : `linear-gradient(#e5e7eb, #e5e7eb)`

  return (
    <Tag
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={['relative', className].join(' ')}
      style={{
        borderRadius,
        padding: borderWidth,
        background: borderGradient,
        transition: showGlow ? 'none' : 'background 0.4s ease',
        ...style,
      }}
      {...rest}
    >
      {/* Inner card — clips to same radius minus border width */}
      <div
        className={['h-full w-full bg-white', innerClassName].join(' ')}
        style={{ borderRadius: `calc(${borderRadius} - ${borderWidth}px)` }}
      >
        {children}
      </div>

      {/* Outer glow halo (blurred, behind the element) */}
      {showGlow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] blur-xl"
          style={{
            background: `radial-gradient(${glowSize * 0.8}px circle at ${pos.x} ${pos.y}, ${glowColor}30, transparent 70%)`,
          }}
        />
      )}
    </Tag>
  )
}

/**
 * BorderGlowCard — pre-styled card variant
 * Drop-in replacement for your existing white card divs.
 */
export function BorderGlowCard({
  children,
  className = '',
  glowColor = '#10b981',
  padding = 'p-5',
  ...props
}) {
  return (
    <BorderGlow
      glowColor={glowColor}
      className={className}
      {...props}
    >
      <div className={['h-full w-full', padding].join(' ')}>
        {children}
      </div>
    </BorderGlow>
  )
}

/**
 * BorderGlowStatCard — stat card with glow, replaces StatCard
 */
export function BorderGlowStatCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  glowColor = '#10b981',
}) {
  return (
    <BorderGlow glowColor={glowColor} borderRadius="1rem">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {title}
            </p>
            {loading ? (
              <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <p className="mt-2 truncate text-2xl font-bold tracking-tight text-gray-900">
                {value}
              </p>
            )}
            {subtitle && !loading && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${glowColor}18`, color: glowColor }}
            >
              {icon}
            </div>
          )}
        </div>
      </div>
    </BorderGlow>
  )
}
