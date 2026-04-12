import { create } from 'zustand'
import { SHARMA_FARM } from '../data/syntheticFarm'

const useFarmStore = create((set, get) => ({
  farm: SHARMA_FARM,
  zones: SHARMA_FARM.zones,
  setFarm: (farm) => set({ farm, zones: farm?.zones || [] }),

  selectedZone: null,
  setSelectedZone: (zone) => set({ selectedZone: zone }),

  apiStatus: { groq: false, gemini: false, checked: false },
  setApiStatus: (s) => set({ apiStatus: { ...s, checked: true } }),

  lastAnalysis: null,
  setLastAnalysis: (a) => set({ lastAnalysis: a }),

  borewellOpen: false,
  setBorewellOpen: (open) => set({ borewellOpen: open }),

  scanState: 'idle',
  scanProgress: 0,
  setScanState: (s) => set({ scanState: s }),
  setScanProgress: (p) => set({ scanProgress: p }),
  // Satellite overlays: zoneId -> { imageUrl, opacity }
  satelliteOverlays: {},
  setSatelliteOverlay: (zoneId, data) =>
    set((s) => ({ satelliteOverlays: { ...s.satelliteOverlays, [zoneId]: data } })),

  alerts: [
    { id: 1, zone: 'Zone C', severity: 'critical', message: 'Moisture critically low — irrigate now' },
    { id: 2, zone: 'Zone A', severity: 'warning', message: 'Nitrogen below optimal — fertilize this week' },
  ],
  setAlerts: (alerts) => set({ alerts }),
}))

export default useFarmStore
