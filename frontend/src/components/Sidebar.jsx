import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Sprout,
  Microscope,
  Navigation,
  TrendingUp,
  Droplets,
  Warehouse,
  FileText,
  QrCode,
  Satellite,
  Leaf,
  Settings,
  Brain,
} from 'lucide-react'
import { useApiStatus } from '../context/ApiStatusContext'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/farm', label: 'Farm', icon: Sprout },
  { to: '/ai-brain', label: 'AI Brain', icon: Brain },
  { to: '/disease', label: 'Disease', icon: Microscope },
  { to: '/drone', label: 'Drone', icon: Navigation },
  { to: '/market', label: 'Market', icon: TrendingUp },
  { to: '/irrigation', label: 'Irrigation', icon: Droplets },
  { to: '/storage', label: 'Storage', icon: Warehouse },
  { to: '/schemes', label: 'Schemes', icon: FileText },
  { to: '/traceability', label: 'Traceability', icon: QrCode },
  { to: '/remote-sensing', label: 'Remote Sensing', icon: Satellite },
]

function ApiStatusIndicators() {
  const { apiStatus } = useApiStatus()
  if (!apiStatus.checked) return null
  return (
    <div className="px-3 py-2 text-xs space-y-1">
      <div className={`flex items-center gap-2 ${apiStatus.groq ? 'text-green-400' : 'text-gray-600'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${apiStatus.groq ? 'bg-green-400' : 'bg-gray-600'}`} />
        Groq AI {apiStatus.groq ? 'connected' : 'offline'}
      </div>
      <div className={`flex items-center gap-2 ${apiStatus.gemini ? 'text-green-400' : 'text-gray-600'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${apiStatus.gemini ? 'bg-green-400' : 'bg-gray-600'}`} />
        Gemini AI {apiStatus.gemini ? 'connected' : 'offline'}
      </div>
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-gray-900 text-white shadow-xl transition-transform duration-200 md:static md:translate-x-0 md:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="border-b border-gray-800 px-4 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600">
              <Leaf className="h-6 w-6 text-white" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-white">AgroSphere AI</p>
              <p className="text-xs text-gray-400">Intelligent Agriculture OS</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-800 p-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <Settings className="h-5 w-5 shrink-0" aria-hidden />
            Settings
          </button>
          <div className="mt-2 flex justify-center">
            <span className="rounded-full bg-green-600/20 px-3 py-1 text-xs font-semibold text-green-400 ring-1 ring-green-600/40">
              Demo Mode
            </span>
          </div>
          <ApiStatusIndicators />
        </div>
      </aside>
    </>
  )
}
