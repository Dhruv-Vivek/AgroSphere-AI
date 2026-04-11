import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildTerrainTextureSet, meshTerrainY } from './droneTerrain.js'

const PLANE = 36

/** Rolling hills + PBR-style maps + irrigation + scatter rocks (game-style ground). */
export function GameTerrain() {
  const baked = useMemo(() => buildTerrainTextureSet(), [])
  useEffect(() => () => baked.dispose(), [baked])

  const { displacementMap, normalMap, map, roughnessMap, min, range } = baked

  return (
    <group>
      <HorizonWater />
      <ShoreBand />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <planeGeometry args={[PLANE, PLANE, 200, 200]} />
        <meshStandardMaterial
          map={map}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.55, 0.55)}
          roughnessMap={roughnessMap}
          roughness={1}
          metalness={0.045}
          displacementMap={displacementMap}
          displacementScale={range}
          displacementBias={min}
          envMapIntensity={0.95}
        />
      </mesh>
      {/* Dark soil under mesh (shadow well) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[PLANE + 0.8, PLANE + 0.8]} />
        <meshStandardMaterial color="#0c1a0d" roughness={1} metalness={0} />
      </mesh>
      <IrrigationChannel />
      <ScatterRocks />
    </group>
  )
}

/** Fills the void beyond the field — reservoir / basin water. */
function HorizonWater() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
      <circleGeometry args={[165, 96]} />
      <meshStandardMaterial
        color="#082f45"
        roughness={0.82}
        metalness={0.22}
        envMapIntensity={0.55}
      />
    </mesh>
  )
}

/** Muddy transition from field edge (18m half) out toward water. */
function ShoreBand() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} receiveShadow>
      <ringGeometry args={[17.4, 22, 96, 1]} />
      <meshStandardMaterial color="#4a3f28" roughness={0.96} metalness={0.03} />
    </mesh>
  )
}

function IrrigationChannel() {
  const span = PLANE - 2
  return (
    <group position={[0, -0.02, -11.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[span, 1.2]} />
        <meshPhysicalMaterial
          color="#0c4a6e"
          roughness={0.12}
          metalness={0.05}
          transmission={0.35}
          thickness={0.4}
          transparent
          opacity={0.92}
          envMapIntensity={1.4}
          clearcoat={0.65}
          clearcoatRoughness={0.2}
        />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[span + 0.2, 0.12, 1.4]} />
        <meshStandardMaterial color="#1c2e14" roughness={0.95} metalness={0.02} />
      </mesh>
    </group>
  )
}

function ScatterRocks() {
  const count = 56
  const meshRef = useRef(null)
  const geo = useMemo(() => new THREE.DodecahedronGeometry(0.22, 0), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#4b5563',
        roughness: 0.88,
        metalness: 0.12,
        flatShading: true,
      }),
    []
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    let rng = 12345
    const rnd = () => {
      rng = (rng * 16807) % 2147483647
      return (rng - 1) / 2147483646
    }
    for (let i = 0; i < count; i++) {
      const x = (rnd() - 0.5) * 29
      const z = (rnd() - 0.5) * 29
      const y = meshTerrainY(x, z) + 0.08 + rnd() * 0.06
      dummy.position.set(x, y, z)
      const s = 0.65 + rnd() * 1.1
      dummy.scale.set(s * (0.8 + rnd() * 0.4), s * (0.5 + rnd() * 0.35), s * (0.85 + rnd() * 0.3))
      dummy.rotation.set(rnd() * 6.2, rnd() * 6.2, rnd() * 6.2)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [count, dummy])

  useEffect(() => {
    return () => {
      geo.dispose()
      mat.dispose()
    }
  }, [geo, mat])

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, count]} castShadow receiveShadow frustumCulled={false} />
  )
}
