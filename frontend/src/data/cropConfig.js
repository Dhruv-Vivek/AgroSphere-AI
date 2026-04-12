export const CROP_CONFIG = {
  Maize: {
    color: 'rgba(234,179,8,0.08)',
    border: '#EAB308',
    optimal: { moisture: [50, 70], ph: [5.8, 7.0], nitrogen: 120, phosphorus: 55, potassium: 80, temperature: [25, 32] },
  },
  Wheat: {
    color: 'rgba(234,179,8,0.06)',
    border: '#D4A017',
    optimal: { moisture: [40, 60], ph: [6.0, 7.5], nitrogen: 100, phosphorus: 50, potassium: 55, temperature: [20, 28] },
  },
  Tomato: {
    color: 'rgba(239,68,68,0.08)',
    border: '#EF4444',
    optimal: { moisture: [55, 75], ph: [6.0, 6.8], nitrogen: 110, phosphorus: 60, potassium: 120, temperature: [22, 32] },
  },
  Rice: {
    color: 'rgba(59,130,246,0.08)',
    border: '#3B82F6',
    optimal: { moisture: [70, 95], ph: [5.5, 6.5], nitrogen: 80, phosphorus: 40, potassium: 45, temperature: [25, 35] },
  },
  Cotton: {
    color: 'rgba(168,85,247,0.08)',
    border: '#A855F7',
    optimal: { moisture: [35, 55], ph: [6.0, 8.0], nitrogen: 90, phosphorus: 45, potassium: 60, temperature: [25, 38] },
  },
  Sugarcane: {
    color: 'rgba(34,197,94,0.08)',
    border: '#22C55E',
    optimal: { moisture: [55, 75], ph: [6.0, 7.5], nitrogen: 130, phosphorus: 55, potassium: 90, temperature: [25, 35] },
  },
  Onion: {
    color: 'rgba(249,115,22,0.08)',
    border: '#F97316',
    optimal: { moisture: [35, 55], ph: [6.0, 7.0], nitrogen: 80, phosphorus: 50, potassium: 70, temperature: [20, 30] },
  },
}

export function getHealthColor(score) {
  if (score >= 75) return '#4ADE80'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

export function getValueStatus(value, range) {
  if (!Array.isArray(range)) return 'optimal'
  const [min, max] = range
  if (value < min * 0.7 || value > max * 1.3) return 'critical'
  if (value < min || value > max) return 'warning'
  return 'optimal'
}
