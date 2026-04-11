import * as THREE from 'three'

/** World extent of the playable field (matches plane size in Three.js units). */
export const TERRAIN_HALF_EXTENT = 18

/**
 * Gentle rolling ground — low amplitude so the field reads flat and even (still has micro variation).
 */
export function worldSurfaceY(worldX, worldZ) {
  let n = 0
  let amp = 1
  let freq = 0.034
  const px = worldX + 2.4
  const pz = worldZ - 1.8
  for (let o = 0; o < 6; o++) {
    n += amp * Math.sin(px * freq + o * 0.7) * Math.cos(pz * freq * 1.06 + o * 0.35)
    n += amp * 0.48 * Math.sin((px + pz * 0.7) * freq * 2.05)
    n += amp * 0.32 * Math.cos((px * 0.6 - pz) * freq * 3.1)
    freq *= 2.08
    amp *= 0.46
  }
  return Math.tanh(n * 0.4) * 0.14
}

/** Bump when `worldSurfaceY` changes so the sampling grid is rebuilt. */
const HEIGHT_GRID_VERSION = 3

/** Drone hover above ground (AGL in scene units). */
export const DRONE_HOVER_AGL = 0.46

/** Same resolution as `buildTerrainTextureSet` bake — must match for alignment. */
const MESH_GRID_RES = 240

let _heightGrid = null
let _heightGridVer = -1

function getHeightGrid() {
  if (_heightGrid && _heightGridVer === HEIGHT_GRID_VERSION) return _heightGrid
  _heightGridVer = HEIGHT_GRID_VERSION
  const res = MESH_GRID_RES
  const span = TERRAIN_HALF_EXTENT * 2
  const h = new Float32Array(res * res)
  for (let j = 0; j < res; j++) {
    const wz = (j / (res - 1)) * span - TERRAIN_HALF_EXTENT
    for (let i = 0; i < res; i++) {
      const wx = (i / (res - 1)) * span - TERRAIN_HALF_EXTENT
      h[j * res + i] = worldSurfaceY(wx, wz)
    }
  }
  _heightGrid = { h, res, span }
  return _heightGrid
}

/** Crops / rocks stay inside this inset from the terrain edge (world units). */
export const FIELD_EDGE_INSET = 1.0

/**
 * Height of the displaced terrain mesh at (x,z) — bilinear sample of the bake grid.
 * Use this (not raw `worldSurfaceY`) for markers, crops, and flight so visuals match GPU.
 */
export function meshTerrainY(worldX, worldZ) {
  const { h, res, span } = getHeightGrid()
  const fu = ((worldX + TERRAIN_HALF_EXTENT) / span) * (res - 1)
  const fv = ((worldZ + TERRAIN_HALF_EXTENT) / span) * (res - 1)
  const u = THREE.MathUtils.clamp(fu, 0, res - 1)
  const v = THREE.MathUtils.clamp(fv, 0, res - 1)
  const u0 = Math.floor(u)
  const v0 = Math.floor(v)
  const u1 = Math.min(res - 1, u0 + 1)
  const v1 = Math.min(res - 1, v0 + 1)
  const tu = u - u0
  const tv = v - v0
  const h00 = h[v0 * res + u0]
  const h10 = h[v0 * res + u1]
  const h01 = h[v1 * res + u0]
  const h11 = h[v1 * res + u1]
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(h00, h10, tu),
    THREE.MathUtils.lerp(h01, h11, tu),
    tv
  )
}

export function droneFlightY(worldX, worldZ) {
  return meshTerrainY(worldX, worldZ) + DRONE_HOVER_AGL
}

/**
 * Bake displacement (R), normal (RGB), albedo (RGBA) for a high-detail ground mesh.
 * @param {number} res texture resolution per axis (256 = heavy but crisp on RTX 3050)
 */
export function buildTerrainTextureSet(res = MESH_GRID_RES) {
  const n = res * res
  const h = new Float32Array(n)
  let min = 1e9
  let max = -1e9
  const span = TERRAIN_HALF_EXTENT * 2

  for (let j = 0; j < res; j++) {
    const wz = (j / (res - 1)) * span - TERRAIN_HALF_EXTENT
    for (let i = 0; i < res; i++) {
      const wx = (i / (res - 1)) * span - TERRAIN_HALF_EXTENT
      const y = worldSurfaceY(wx, wz)
      const idx = j * res + i
      h[idx] = y
      min = Math.min(min, y)
      max = Math.max(max, y)
    }
  }
  const range = Math.max(1e-4, max - min)

  const disp = new Uint8Array(n * 4)
  const norm = new Uint8Array(n * 4)
  const alb = new Uint8Array(n * 4)

  const getH = (i, j) => {
    const ii = Math.max(0, Math.min(res - 1, i))
    const jj = Math.max(0, Math.min(res - 1, j))
    return h[jj * res + ii]
  }

  const spread = 1.15
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const idx = (j * res + i) * 4
      const hn = (h[j * res + i] - min) / range
      disp[idx] = Math.floor(THREE.MathUtils.clamp(hn * 255, 0, 255))
      disp[idx + 1] = disp[idx]
      disp[idx + 2] = disp[idx]
      disp[idx + 3] = 255

      const dhdx = (getH(i + 1, j) - getH(i - 1, j)) * 0.5 * spread
      const dhdz = (getH(i, j + 1) - getH(i, j - 1)) * 0.5 * spread
      const nx = -dhdx
      const ny = 1
      const nz = -dhdz
      const len = Math.hypot(nx, ny, nz) || 1
      norm[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255)
      norm[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255)
      norm[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255)
      norm[idx + 3] = 255

      const slope = Math.min(1, Math.hypot(dhdx, dhdz) * 3.2)
      const g = 55 + (1 - slope) * 95 + hn * 28
      const r = 18 + slope * 55 + hn * 20
      const b = 22 + (1 - slope) * 35
      alb[idx] = Math.floor(THREE.MathUtils.clamp(r, 0, 255))
      alb[idx + 1] = Math.floor(THREE.MathUtils.clamp(g, 0, 255))
      alb[idx + 2] = Math.floor(THREE.MathUtils.clamp(b, 0, 255))
      alb[idx + 3] = 255
    }
  }

  const makeTex = (arr, colorSpace, repeat = 1) => {
    const t = new THREE.DataTexture(arr, res, res, THREE.RGBAFormat, THREE.UnsignedByteType)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    t.flipY = false
    t.colorSpace = colorSpace
    t.needsUpdate = true
    t.anisotropy = 16
    if (repeat !== 1) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(repeat, repeat)
    }
    return t
  }

  const displacementMap = makeTex(disp, THREE.NoColorSpace)
  const normalMap = makeTex(norm, THREE.NoColorSpace)
  const map = makeTex(alb, THREE.SRGBColorSpace)

  const roughData = new Uint8Array(n * 4)
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const k = j * res + i
      const dhdx = (getH(i + 1, j) - getH(i - 1, j)) * 0.5
      const dhdz = (getH(i, j + 1) - getH(i, j - 1)) * 0.5
      const slope = Math.hypot(dhdx, dhdz)
      const jitter = ((i * 17 + j * 31) % 19) - 9
      const v = Math.floor(THREE.MathUtils.clamp(40 + slope * 120 + jitter, 0, 255))
      roughData[k * 4] = v
      roughData[k * 4 + 1] = v
      roughData[k * 4 + 2] = v
      roughData[k * 4 + 3] = 255
    }
  }
  const roughnessMap = makeTex(roughData, THREE.NoColorSpace)

  const dispose = () => {
    displacementMap.dispose()
    normalMap.dispose()
    map.dispose()
    roughnessMap.dispose()
  }

  return {
    displacementMap,
    normalMap,
    map,
    roughnessMap,
    min,
    max,
    range,
    dispose,
  }
}
