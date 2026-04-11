import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

const titles = {
  '/': 'Dashboard',
  '/farm': 'Farm Intel',
  '/disease': 'Disease Detection',
  '/drone': 'Drone',
  '/market': 'Market Intelligence',
  '/irrigation': 'Irrigation',
  '/storage': 'Storage',
  '/schemes': 'Government Schemes',
  '/traceability': 'Traceability',
  '/remote-sensing': 'Remote Sensing',
}

export default function Navbar({ onOpenSidebar = () => {} }) {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'AgroSphere AI'

  return (
    <header className="flex items-start gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:items-center md:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="mt-0.5 rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-500">API: http://localhost:5000/api</p>
      </div>
    </header>
  )
}
