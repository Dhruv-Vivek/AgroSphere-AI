import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wheat, Leaf, Circle, Droplets, AlertTriangle, Camera, UploadCloud } from 'lucide-react'
import useFarmStore from '../../store/farmStore'
import { CROP_CONFIG, getHealthColor } from '../../data/cropConfig'

const CROP_ICONS = { Maize: Wheat, Wheat: Leaf, Tomato: Circle, Rice: Droplets }

export default function ZoneMap() {
  const { zones, selectedZone, setSelectedZone, setBorewellOpen } = useFarmStore()
  const farm = useFarmStore((s) => s.farm)
  const scanProgress = useFarmStore((s) => s.scanProgress)
  const setScanState = useFarmStore((s) => s.setScanState)
  const setScanProgress = useFarmStore((s) => s.setScanProgress)
  const satelliteOverlays = useFarmStore((s) => s.satelliteOverlays)
  const setSatelliteOverlay = useFarmStore((s) => s.setSatelliteOverlay)

  const [localScanning, setLocalScanning] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    // when scan completes, reset progress after a short delay
    if (scanProgress >= 100) {
      setTimeout(() => setScanProgress(0), 800)
      setScanState('complete')
      setTimeout(() => setScanState('idle'), 1200)
      setLocalScanning(false)
    }
  }, [scanProgress, setScanProgress, setScanState])

  function startDroneScan() {
    if (localScanning) return
    setScanState('scanning')
    setLocalScanning(true)
    setScanProgress(0)
    const duration = 3000
    const start = Date.now()
    const id = setInterval(() => {
      const t = Date.now() - start
      const p = Math.min(100, Math.round((t / duration) * 100))
      setScanProgress(p)
      if (p >= 100) {
        clearInterval(id)
      }
    }, 80)
  }

  function handleUploadClick() {
    fileRef.current?.click()
  }

  function onFileChange(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result
      const targetZone = selectedZone?.id || zones[0]?.id
      if (targetZone) setSatelliteOverlay(targetZone, { imageUrl: url, opacity: 0.7 })
    }
    reader.readAsDataURL(file)
    e.target.value = null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Farm Zones</h2>
        <span className="text-xs text-gray-500">{zones.length} zones · {farm?.total_acres} acres</span>
      </div>

      <div className="relative">
        {/* Overlay controls */}
        <div className="absolute top-2 left-2 z-20 flex gap-2">
          <button onClick={handleUploadClick} className="flex items-center gap-2 bg-bg-card hover:bg-bg-card-hover text-text-primary px-3 py-1 rounded-md text-xs border border-border">
            <Camera size={14} /> Upload
          </button>
        </div>

        <div className="absolute top-2 right-2 z-20 flex gap-2">
          <button onClick={startDroneScan} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-md text-xs">
            🛸 Drone scan
          </button>
        </div>

        {/* Hidden file input */}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

        <motion.div layoutId="farm-map" className="grid grid-cols-2 gap-3">
          {zones.map((zone, idx) => {
            const isSelected = selectedZone?.id === zone.id
            const config = CROP_CONFIG[zone.crop] || {}
            const Icon = CROP_ICONS[zone.crop] || Leaf
            const healthColor = getHealthColor(zone.health_score)
            const isCritical = zone.status === 'critical'
            const isWarning = zone.status === 'warning'

            const borderColor = isSelected
              ? '#10B981'
              : isCritical
                ? '#EF4444'
                : isWarning
                  ? '#F59E0B'
                  : config.border || '#D1D5DB'

            // zone-specific scan flash when scan progress passes the zone index
            const zoneThreshold = Math.round(((idx + 1) / Math.max(1, zones.length)) * 100)
            const isScanningNow = localScanning && scanProgress >= zoneThreshold - (100 / zones.length) && scanProgress <= zoneThreshold + 10

            return (
              <motion.div
                key={zone.id}
                onClick={() => setSelectedZone(isSelected ? null : zone)}
                className={`relative cursor-pointer rounded-xl p-4 flex flex-col gap-2 select-none transition-all duration-200 overflow-hidden`}
                style={{
                  background: isSelected ? '#ECFDF5' : config.color || '#F9FAFB',
                  border: `2px solid ${borderColor}`,
                }}
                whileHover={{ scale: 1.02 }}
                animate={{ scale: isSelected ? 1.02 : 1 }}
              >
                {/* Satellite overlay image */}
                {satelliteOverlays?.[zone.id]?.imageUrl && (
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    <img src={satelliteOverlays[zone.id].imageUrl} alt="overlay" className="w-full h-full object-cover opacity-80" style={{ opacity: satelliteOverlays[zone.id].opacity || 0.7 }} />
                    <div className="absolute top-2 left-2 bg-black/40 text-xs text-white px-2 py-0.5 rounded">📷 Satellite overlay active</div>
                  </div>
                )}

                {/* scanning flash overlay */}
                <AnimatePresence>
                  {isScanningNow && (
                    <motion.div
                      key="scan"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.18 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 bg-emerald-300 z-10"
                    />
                  )}
                </AnimatePresence>

                {/* Alert pulse */}
                {(isCritical || isWarning) && (
                  <span
                    className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${
                      isCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                    } z-20`}
                  />
                )}

                {/* Header */}
                <div className="flex items-center justify-between z-20">
                  <Icon size={16} style={{ color: config.border || '#6B7280' }} />
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded font-semibold uppercase"
                    style={{
                      background: isCritical ? 'rgba(239,68,68,0.12)' : isWarning ? 'rgba(245,158,11,0.12)' : 'rgba(74,222,128,0.12)',
                      color: isCritical ? '#DC2626' : isWarning ? '#D97706' : '#059669',
                    }}
                  >
                    {zone.status}
                  </span>
                </div>

                {/* Zone info */}
                <div className="z-20">
                  <div className="font-semibold text-gray-900 text-sm leading-tight">{zone.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{zone.crop} · {zone.acres} ac</div>
                </div>

                {/* Moisture bar */}
                <div className="z-20">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Moisture</span>
                    <span style={{ color: zone.sensors.moisture < 35 ? '#EF4444' : zone.sensors.moisture < 50 ? '#F59E0B' : '#10B981' }}>
                      {zone.sensors.moisture}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${zone.sensors.moisture}%`,
                        background: zone.sensors.moisture < 35 ? '#EF4444' : zone.sensors.moisture < 50 ? '#F59E0B' : '#10B981',
                      }}
                    />
                  </div>
                </div>

                {/* Health */}
                <div className="flex justify-between items-center text-xs z-20">
                  <span className="text-gray-500">Health</span>
                  <span style={{ color: healthColor }} className="font-mono font-medium">{zone.health_score}%</span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Drone scan line */}
        <AnimatePresence>
          {localScanning && (
            <motion.div
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ duration: 3, ease: 'linear' }}
              className="absolute left-0 right-0 h-0.5 bg-emerald-400 opacity-80 z-30"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Borewell card */}
      <div
        onClick={() => setBorewellOpen(true)}
        className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50/60 p-3 flex items-center gap-3 hover:bg-blue-50 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Droplets className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900">Borewell</div>
          <div className="text-xs text-gray-500">
            {farm?.borewell?.motor_on ? 'Running' : 'Idle'} · {farm?.borewell?.flow_rate_lpm} L/min · {farm?.borewell?.depth_ft} ft
          </div>
        </div>
        <span className="text-xs text-blue-600 font-medium">Details →</span>
      </div>

    </div>
  )
}
