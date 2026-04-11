import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

/**
 * CardNav — React Bits style
 * Animated navigation cards with hover glow + active indicator
 *
 * Props:
 *   items: Array<{ to: string, label: string, icon: ReactNode, description?: string, color?: string }>
 *   columns?: number (default 5)
 */
export default function CardNav({ items = [], columns = 5 }) {
  const { pathname } = useLocation()
  const [hovered, setHovered] = useState(null)

  return (
    <nav
      aria-label="Module navigation"
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const isActive = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to))
        const color = item.color || 'emerald'

        const colorMap = {
          emerald: {
            active: 'bg-emerald-600 text-white shadow-emerald-900/20',
            icon:   'bg-emerald-100 text-emerald-700',
            iconA:  'bg-emerald-500/30 text-white',
            glow:   'rgba(16,185,129,0.25)',
            ring:   'ring-emerald-500',
            text:   'text-emerald-600',
          },
          blue: {
            active: 'bg-blue-600 text-white shadow-blue-900/20',
            icon:   'bg-blue-100 text-blue-700',
            iconA:  'bg-blue-500/30 text-white',
            glow:   'rgba(59,130,246,0.25)',
            ring:   'ring-blue-500',
            text:   'text-blue-600',
          },
          violet: {
            active: 'bg-violet-600 text-white shadow-violet-900/20',
            icon:   'bg-violet-100 text-violet-700',
            iconA:  'bg-violet-500/30 text-white',
            glow:   'rgba(139,92,246,0.25)',
            ring:   'ring-violet-500',
            text:   'text-violet-600',
          },
          amber: {
            active: 'bg-amber-500 text-white shadow-amber-900/20',
            icon:   'bg-amber-100 text-amber-700',
            iconA:  'bg-amber-400/30 text-white',
            glow:   'rgba(245,158,11,0.25)',
            ring:   'ring-amber-500',
            text:   'text-amber-600',
          },
          red: {
            active: 'bg-red-600 text-white shadow-red-900/20',
            icon:   'bg-red-100 text-red-700',
            iconA:  'bg-red-500/30 text-white',
            glow:   'rgba(239,68,68,0.25)',
            ring:   'ring-red-500',
            text:   'text-red-600',
          },
          teal: {
            active: 'bg-teal-600 text-white shadow-teal-900/20',
            icon:   'bg-teal-100 text-teal-700',
            iconA:  'bg-teal-500/30 text-white',
            glow:   'rgba(20,184,166,0.25)',
            ring:   'ring-teal-500',
            text:   'text-teal-600',
          },
        }

        const c = colorMap[color] || colorMap.emerald
        const isHovered = hovered === item.to

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onMouseEnter={() => setHovered(item.to)}
            onMouseLeave={() => setHovered(null)}
            className={[
              'group relative flex flex-col items-center gap-2.5 rounded-2xl p-4',
              'border transition-all duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-offset-2',
              isActive
                ? `${c.active} border-transparent shadow-lg ${c.ring}`
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md',
              c.ring,
            ].join(' ')}
            style={
              !isActive && isHovered
                ? { boxShadow: `0 8px 24px ${c.glow}, 0 2px 8px rgba(0,0,0,0.06)` }
                : undefined
            }
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Icon */}
            <span
              className={[
                'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                isActive ? c.iconA : c.icon,
              ].join(' ')}
            >
              {item.icon}
            </span>

            {/* Label */}
            <span
              className={[
                'text-center text-xs font-semibold leading-tight transition-colors duration-200',
                isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900',
              ].join(' ')}
            >
              {item.label}
            </span>

            {/* Active dot indicator */}
            {isActive && (
              <span
                aria-hidden
                className="absolute bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white/70"
              />
            )}

            {/* Hover shimmer overlay */}
            {!isActive && isHovered && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  background: `radial-gradient(circle at center, ${c.glow} 0%, transparent 70%)`,
                }}
              />
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
