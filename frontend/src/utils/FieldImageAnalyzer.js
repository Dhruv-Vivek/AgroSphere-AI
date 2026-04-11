/**
 * Field / nadir image analysis for drone spray targeting (client-side MVP).
 * Uses HSV for yellow / brown stress tones and RGB guards for red / low-green patches.
 */

/** Tune these for different crops, lighting, or sensors. */
export const FIELD_ANALYSIS_THRESHOLDS = {
  /** Green channel below this (0–255) contributes to “unhealthy” when combined with other cues. */
  greenLow: 105,
  /** Red must exceed green by this much for a “high red” stress flag. */
  redGreenDelta: 12,
  /** Absolute red level for high-red cue. */
  redHigh: 95,
  /** Yellow hue band (degrees). */
  yellowHueMin: 38,
  yellowHueMax: 78,
  yellowSatMin: 0.2,
  yellowValMin: 0.15,
  /** Brown: dark, earthy hue. */
  brownHueMin: 12,
  brownHueMax: 48,
  brownSatMin: 0.12,
  brownValMax: 0.52,
  /** Analysis resolution (square). */
  analysisSize: 128,
  /** Spatial binning for clusters. */
  gridSize: 12,
  minSamplesPerCluster: 2,
  maxZones: 15,
  /** Step between samples (after resize). */
  sampleStep: 2,
}

/**
 * RGB [0,255] → HSV with h ∈ [0,360), s,v ∈ [0,1]
 */
export function rgbToHsv(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d > 1e-6) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
  }
  const s = max <= 1e-6 ? 0 : d / max
  const v = max
  return { h: h * 360, s, v }
}

/**
 * Pixel-level damage score 0–1 and coarse severity label.
 */
function scorePixel(r, g, b, t) {
  const { h, s, v } = rgbToHsv(r, g, b)
  let score = 0

  const lowGreen = g < t.greenLow && (g < r || g < b * 1.05)
  if (lowGreen) score += 0.35

  const highRed = r > t.redHigh && r > g + t.redGreenDelta
  if (highRed) score += 0.4

  const yellowStress =
    h >= t.yellowHueMin && h <= t.yellowHueMax && s >= t.yellowSatMin && v >= t.yellowValMin
  if (yellowStress) score += 0.45

  const brown =
    v <= t.brownValMax && h >= t.brownHueMin && h <= t.brownHueMax && s >= t.brownSatMin
  if (brown) score += 0.5

  const damaged = score >= 0.35
  if (!damaged) return { damaged: false, score: 0, severity: 'medium' }

  const severity = score >= 0.75 ? 'high' : 'medium'
  return { damaged: true, score, severity }
}

function loadImageSourceToCanvas(imageInput, size, t) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      reject(new Error('Canvas unsupported'))
      return
    }

    const draw = (src) => {
      try {
        ctx.drawImage(src, 0, 0, size, size)
        resolve(ctx.getImageData(0, 0, size, size))
      } catch (e) {
        reject(e)
      }
    }

    if (typeof imageInput === 'string') {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => draw(img)
      img.onerror = () => reject(new Error('Failed to load image URL'))
      img.src = imageInput
      return
    }

    if (imageInput instanceof Blob) {
      const url = URL.createObjectURL(imageInput)
      const img = new Image()
      img.onload = () => {
        draw(img)
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to decode image blob'))
      }
      img.src = url
      return
    }

    reject(new TypeError('analyzeFieldImage: expected data URL string or Blob/File'))
  })
}

/**
 * Grid clustering → normalized zone centroids; caps to `maxZones` richest clusters.
 */
function clusterSamples(samples, t) {
  const { gridSize: gw, minSamplesPerCluster: minS, maxZones } = t
  const buckets = Array.from({ length: gw * gw }, () => ({
    sumX: 0,
    sumY: 0,
    w: 0,
    highW: 0,
  }))

  for (const p of samples) {
    const bx = Math.min(gw - 1, Math.floor(p.nx * gw))
    const by = Math.min(gw - 1, Math.floor(p.ny * gw))
    const b = buckets[by * gw + bx]
    const weight = 0.5 + p.score
    b.sumX += p.nx * weight
    b.sumY += p.ny * weight
    b.w += weight
    if (p.severity === 'high') b.highW += weight
  }

  let zones = buckets
    .map((b, i) => ({
      x: b.w > 0 ? b.sumX / b.w : 0,
      y: b.w > 0 ? b.sumY / b.w : 0,
      w: b.w,
      severity: b.highW > b.w * 0.38 ? 'high' : 'medium',
    }))
    .filter((z) => z.w >= minS * 0.5)
    .sort((a, b) => b.w - a.w)
    .slice(0, maxZones)
    .map(({ x, y, severity }) => ({ x, y, severity }))

  if (!zones.length && samples.length) {
    const tw = samples.reduce((s, p) => s + 0.5 + p.score, 0)
    const x = samples.reduce((s, p) => s + p.nx * (0.5 + p.score), 0) / tw
    const y = samples.reduce((s, p) => s + p.ny * (0.5 + p.score), 0) / tw
    const highs = samples.filter((p) => p.severity === 'high').length
    zones = [{ x, y, severity: highs > samples.length * 0.35 ? 'high' : 'medium' }]
  }

  return zones
}

/**
 * Analyze a nadir / field image and return normalized damage zones.
 *
 * @param {string | Blob | File} image — data URL, object-URL-safe string, or file/blob
 * @param {Partial<typeof FIELD_ANALYSIS_THRESHOLDS>} [thresholdOverrides]
 * @returns {Promise<{ zones: Array<{ x: number, y: number, severity: string }>, sampleCount: number }>}
 */
export async function analyzeFieldImage(image, thresholdOverrides = {}) {
  const t = { ...FIELD_ANALYSIS_THRESHOLDS, ...thresholdOverrides }
  const size = t.analysisSize
  const { data, width, height } = await loadImageSourceToCanvas(image, size, t)
  const step = Math.max(1, t.sampleStep)
  const samples = []

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const { damaged, score, severity } = scorePixel(r, g, b, t)
      if (!damaged) continue
      samples.push({
        nx: (x + 0.5 * step) / width,
        ny: (y + 0.5 * step) / height,
        score,
        severity,
      })
    }
  }

  const zones = clusterSamples(samples, t)
  return { zones, sampleCount: samples.length }
}

/**
 * Synthetic nadir frame for demos when the operator has not uploaded a field photo.
 * Green “crop” with brown/yellow stress patches.
 */
export function getDefaultFieldCaptureDataUrl() {
  const w = 256
  const h = 256
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#2d6a3e')
  g.addColorStop(0.5, '#3f7d4a')
  g.addColorStop(1, '#2f5f38')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const patches = [
    { x: 0.22, y: 0.28, rw: 0.18, rh: 0.14 },
    { x: 0.62, y: 0.22, rw: 0.16, rh: 0.2 },
    { x: 0.48, y: 0.58, rw: 0.22, rh: 0.12 },
    { x: 0.12, y: 0.62, rw: 0.14, rh: 0.18 },
    { x: 0.78, y: 0.65, rw: 0.15, rh: 0.15 },
  ]
  for (const p of patches) {
    ctx.fillStyle = `rgba(${140 + Math.random() * 40}, ${90 + Math.random() * 30}, 45, 0.88)`
    ctx.beginPath()
    ctx.ellipse(
      p.x * w,
      p.y * h,
      p.rw * w * 0.5,
      p.rh * h * 0.5,
      Math.random() * 0.5,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(200, 180, 60, 0.25)'
  ctx.fillRect(w * 0.35, h * 0.4, w * 0.2, h * 0.08)

  return c.toDataURL('image/jpeg', 0.85)
}
