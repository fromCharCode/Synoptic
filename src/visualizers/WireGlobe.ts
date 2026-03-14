import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'

// ── Pre-allocated temporaries (zero GC in render loop) ──
const _color = new THREE.Color()
const _hsl = { h: 0, s: 0, l: 0 }
const _v3 = new THREE.Vector3()

// ── Destination definitions ──
export const WIRE_GLOBE_DESTINATIONS: Destination[] = [
  { id: 'wgRadius',   label: 'Radius',    group: 'Globe',  defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0, colorIndex: 2 },
  { id: 'wgDisp',     label: 'Displace',  group: 'Globe',  defaultSource: 'none', defaultAmount: 0, min:  0.0, max: 1.0, colorIndex: 2 },
  { id: 'wgHue',      label: 'Hue',       group: 'Color',  defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 3 },
  { id: 'wgGlow',     label: 'Glow',      group: 'Color',  defaultSource: 'none', defaultAmount: 0, min:  0.0, max: 1.0, colorIndex: 3 },
  { id: 'wgRotSpeed', label: 'Rot Speed', group: 'Globe',  defaultSource: 'none', defaultAmount: 0, min: -1.0, max: 1.0, colorIndex: 2 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'radius',       label: 'Radius',        type: 'slider', min: 10, max: 100, default: 40,  group: 'Globe' },
  { id: 'wireCount',    label: 'Subdivisions',  type: 'slider', min: 2,  max: 8,   default: 4,   group: 'Globe' },
  { id: 'displacement', label: 'Displacement',  type: 'slider', min: 0,  max: 100, default: 20,  group: 'Globe' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'rotate',      label: 'Auto Rotate', default: true  },
  { id: 'glow',        label: 'Glow',        default: true  },
  { id: 'innerSphere', label: 'Inner Sphere', default: false },
]

export function createWireGlobe(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}

  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let lineSegments: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null
  let innerMesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial> | null = null
  let group: THREE.Group | null = null
  let scene: THREE.Scene | null = null
  let elapsed = 0

  // Store original vertex positions for displacement
  let basePositions: Float32Array = new Float32Array(0)

  function buildGlobe(detail: number, radius: number): { lines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>, positions: Float32Array } {
    const geo = new THREE.IcosahedronGeometry(radius, detail)

    // Convert to line segments (each triangle edge)
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const index = geo.getIndex()

    const linePositions: number[] = []

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i)
        const b = index.getX(i + 1)
        const c = index.getX(i + 2)

        const addEdge = (v0: number, v1: number) => {
          linePositions.push(
            posAttr.getX(v0), posAttr.getY(v0), posAttr.getZ(v0),
            posAttr.getX(v1), posAttr.getY(v1), posAttr.getZ(v1),
          )
        }
        addEdge(a, b)
        addEdge(b, c)
        addEdge(c, a)
      }
    } else {
      for (let i = 0; i < posAttr.count; i += 3) {
        const addEdge = (v0: number, v1: number) => {
          linePositions.push(
            posAttr.getX(v0), posAttr.getY(v0), posAttr.getZ(v0),
            posAttr.getX(v1), posAttr.getY(v1), posAttr.getZ(v1),
          )
        }
        addEdge(i, i + 1)
        addEdge(i + 1, i + 2)
        addEdge(i + 2, i)
      }
    }

    geo.dispose()

    const lineGeo = new THREE.BufferGeometry()
    const posArr = new Float32Array(linePositions)
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))

    const mat = new THREE.LineBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const lines = new THREE.LineSegments(lineGeo, mat)
    return { lines, positions: posArr.slice() }
  }

  return {
    id: 'wire-globe',
    name: 'Wire Globe',
    category: '3d',
    description: 'Wireframe Globus mit audio-getriebenem Vertex-Displacement',
    params: PARAMS,
    toggles: TOGGLES,

    init(context: VisualizerContext) {
      scene = context.scene

      group = new THREE.Group()
      scene.add(group)

      const detail = Math.round(paramValues['wireCount'] ?? 4)
      const radius = (paramValues['radius'] ?? 40) / 100 * 5

      const { lines, positions } = buildGlobe(detail, radius)
      lineSegments = lines
      basePositions = positions
      group.add(lineSegments)

      // Inner sphere
      const innerGeo = new THREE.IcosahedronGeometry(radius * 0.95, 1)
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x001133,
        transparent: true,
        opacity: 0.5,
        side: THREE.BackSide,
      })
      innerMesh = new THREE.Mesh(innerGeo, innerMat)
      innerMesh.visible = toggleValues['innerSphere'] ?? false
      group.add(innerMesh)
    },

    update(dt: number, patchbay: Patchbay) {
      if (!lineSegments || !group) return
      elapsed += dt

      const radiusParam  = (paramValues['radius'] ?? 40) / 100 * 5
      const dispParam    = (paramValues['displacement'] ?? 20) / 100
      const radiusMod    = patchbay.get('wgRadius')
      const dispMod      = patchbay.get('wgDisp')
      const rotSpeedMod  = patchbay.get('wgRotSpeed')
      const glowMod      = patchbay.get('wgGlow')

      const effectiveRadius = Math.max(0.1, radiusParam + radiusMod * 2)
      const effectiveDisp   = Math.max(0, dispParam + dispMod)

      // Rotation
      if (toggleValues['rotate']) {
        group.rotation.y += (0.2 + rotSpeedMod * 0.5) * dt
        group.rotation.x += 0.05 * dt
      } else {
        group.rotation.y += rotSpeedMod * 0.5 * dt
      }

      // Vertex displacement via audio
      if (effectiveDisp > 0.001) {
        const posAttr = lineSegments.geometry.getAttribute('position') as THREE.BufferAttribute
        const count = posAttr.count

        for (let i = 0; i < count; i++) {
          const i3 = i * 3
          const bx = basePositions[i3] ?? 0
          const by = basePositions[i3 + 1] ?? 0
          const bz = basePositions[i3 + 2] ?? 0

          _v3.set(bx, by, bz)
          const baseLen = _v3.length()
          _v3.normalize()

          // Per-vertex displacement using position as seed
          const angle = Math.atan2(by, bx)
          const d = effectiveDisp * effectiveRadius * (
            Math.sin(angle * 3 + elapsed * 2) * 0.5 +
            Math.sin(_v3.z * 5 + elapsed * 3) * 0.3
          )

          const newLen = baseLen * (effectiveRadius / Math.max(0.001, radiusParam)) + d
          posAttr.setXYZ(i, _v3.x * newLen, _v3.y * newLen, _v3.z * newLen)
        }
        posAttr.needsUpdate = true
      } else {
        // Scale to effective radius without displacement
        const scale = effectiveRadius / Math.max(0.001, radiusParam)
        const posAttr = lineSegments.geometry.getAttribute('position') as THREE.BufferAttribute
        const count = posAttr.count
        for (let i = 0; i < count; i++) {
          const i3 = i * 3
          posAttr.setXYZ(i,
            (basePositions[i3] ?? 0) * scale,
            (basePositions[i3 + 1] ?? 0) * scale,
            (basePositions[i3 + 2] ?? 0) * scale,
          )
        }
        posAttr.needsUpdate = true
      }

      // Color + glow
      _color.setHSL(0.58, 0.9, 0.55)
      _color.getHSL(_hsl)
      let h = _hsl.h + patchbay.get('wgHue')
      if (h > 1) h -= Math.floor(h)
      if (h < 0) h += Math.ceil(-h)
      const brightness = Math.min(1, _hsl.l + glowMod * 0.5)
      lineSegments.material.color.setHSL(h, _hsl.s, brightness)
      lineSegments.material.opacity = (toggleValues['glow'] ? 0.9 : 0.6) + glowMod * 0.1

      // Inner sphere toggle
      if (innerMesh) innerMesh.visible = toggleValues['innerSphere'] ?? false
    },

    resize(_width: number, _height: number) { /* camera handled externally */ },

    dispose() {
      if (lineSegments) {
        lineSegments.geometry.dispose()
        lineSegments.material.dispose()
      }
      if (innerMesh) {
        innerMesh.geometry.dispose()
        innerMesh.material.dispose()
      }
      if (group && scene) {
        scene.remove(group)
      }
      lineSegments = null
      innerMesh = null
      group = null
      scene = null
    },

    setOpacity(opacity: number) {
      if (lineSegments) {
        lineSegments.material.opacity = opacity
        lineSegments.material.transparent = opacity < 1
      }
    },
  }
}
