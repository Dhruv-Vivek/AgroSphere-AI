import { useState } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MitraChatProvider } from './context/MitraChatContext'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import ChatBot from './components/ChatBot'
import Dashboard from './pages/Dashboard'
import FarmIntel from './pages/FarmIntel'
import DiseaseDetection from './pages/DiseaseDetection'
import DronePage from './pages/DronePage'
import MarketIntelligence from './pages/MarketIntelligence'
import Irrigation from './pages/Irrigation'
import Storage from './pages/Storage'
import GovtSchemes from './pages/GovtSchemes'
import Traceability from './pages/Traceability'
import RemoteSensing from './pages/RemoteSensing'

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <ChatBot />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: '!bg-white !text-gray-800 !shadow-lg !border !border-gray-100',
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MitraChatProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/farm" element={<FarmIntel />} />
            <Route path="/disease" element={<DiseaseDetection />} />
            <Route path="/drone" element={<DronePage />} />
            <Route path="/market" element={<MarketIntelligence />} />
            <Route path="/irrigation" element={<Irrigation />} />
            <Route path="/storage" element={<Storage />} />
            <Route path="/schemes" element={<GovtSchemes />} />
            <Route path="/traceability" element={<Traceability />} />
            <Route path="/remote-sensing" element={<RemoteSensing />} />
          </Route>
        </Routes>
      </MitraChatProvider>
    </BrowserRouter>
  )
}
