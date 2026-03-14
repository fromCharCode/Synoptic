import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'

// ── Pre-allocated temporaries (zero GC in render loop) ──
const _color = new THREE.Color()
const _hsl = { h: 0, s: 0, l: 0 }
const _mat4 = new THREE.Matrix4()
const _quat = new THREE.Quaternion()
const _scale = new THREE.Vector3(1, 1, 1)
const _pos = new THREE.Vector3()

// ── Destination definitions ──
export const TUNNEL_DESTINATIONS: Destination[] = [
  { id: 'tRadius',  label: 'Radius',   group: 'Tunnel', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0, colorIndex: 2 },
  { id: 'tSpeed',   label: 'Speed',    group: 'Tunnel', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0, colorIndex: 2 },
  { id: 'tTwist',   label: 'Twist',    group: 'Tunnel', defaultSource: 'none', defaultAmount: 0, min: -1.0, max: 1.0, colorIndex: 2 },
  { id: 'tHue',     label: 'Hue',      group: 'Color',  defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 3 },
  { id: 'tPulse',   label: 'Pulse',    group: 'Tunnel', defaultSource: 'none', defaultAmount: 0, min:  0.0, max: 1.0, colorIndex: 2 },
  { id: 'tRingGap', label: 'Ring Gap', group: 'Tunnel', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 2 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'radius',       label: 'Radius',        type: 'slider', min: 1,  max: 100, default: 30,  group: 'Tunnel' },
  { id: 'ringCount',    label: 'Ring Count',     type: 'slider', min: 50, max: 200, default: 100, group: 'Tunnel' },
  { id: 'ringSegments', label: 'Ring Segments',  type: 'slider', min: 4,  max: 32,  default: 16,  group: 'Tunnel' },
  { id: 'speed',        label: 'Speed',          type: 'slider', min: 0,  max: 100, default: 30,  group: 'Tunnel' },
  { id: 'twist',        label: 'Twist',          type: 'slider', min: 0,  max: 100, default: 10,  group: 'Tunnel' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'wireframe',   label: 'Wireframe',    default: true  },
  { id: 'glow',        label: 'Glow',         default: true  },
  { id: 'colorRings',  label: 'Color Rings',  default: true  },
]

export function createTunnel(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}

  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let instancedMesh: THREE.InstancedMesh | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let group: THREE.Group | null = null
  let elapsed = 0
  let currentRingCount = 100

  // Per-ring color array
  let ringColors: Float32Array = new Float32Array(200 * 3)

  function buildMesh(ringCount: number, ringSegs: number): THREE.InstancedMesh {
    const radius = (paramValues['radius'] ?? 30) / 30 * 3
    const geo = new THREE.TorusGeometry(radius, radius * 0.04, 4, ringSegs)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: toggleValues['wireframe'] ?? true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const im = new THREE.InstancedMesh(geo, mat, ringCount)
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    // Initialize instance colors
    ringColors = new Float32Array(ringCount * 3)
    for (let i = 0; i < ringCount; i++) {
      const hue = i / ringCount
      _color.setHSL(hue, 0.9, 0.5)
      ringColors[i * 3]     = _color.r
      ringColors[i * 3 + 1] = _color.g
      ringColors[i * 3 + 2] = _color.b
    }

    const colorAttr = new THREE.InstancedBufferAttribute(ringColors, 3)
    im.geometry.setAttribute('instanceColor', colorAttr)

    return im
  }

  function updateRingPositions(im: THREE.InstancedMesh, ringCount: number, elapsedTime: number, radiusMod: number, twistMod: number, gapMod: number) {
    const baseRadius = (paramValues['radius'] ?? 30) / 30 * 3
    const spacing = 2.0 + gapMod
    const totalLength = ringCount * spacing
    const twistAmt = (paramValues['twist'] ?? 10) / 100 * Math.PI + twistMod * Math.PI

    for (let i = 0; i < ringCount; i++) {
      let z = ((i * spacing) - (elapsedTime % totalLength) + totalLength) % totalLength
      // Place rings behind camera up to totalLength away
      z = -z

      const twist = (i / ringCount) * twistAmt
      _pos.set(0, 0, z)
      _quat.setFromEuler(new THREE.Euler(0, 0, twist + elapsedTime * 0.1))

      const pulseRadius = baseRadius + Math.sin(elapsedTime * 2 + i * 0.3) * radiusMod * 0.5
      _scale.setScalar(pulseRadius / baseRadius)

      _mat4.compose(_pos, _quat, _scale)
      im.setMatrixAt(i, _mat4)
    }
    im.instanceMatrix.needsUpdate = true
  }

  return {
    id: 'tunnel',
    name: 'Tunnel',
    category: '3d',
    description: 'Kamera fliegt durch pulsierende Tunnel aus instanzierten Ringen',
    params: PARAMS,
    toggles: TOGGLES,

    init(context: VisualizerContext) {
      scene = context.scene
      camera = context.camera

      group = new THREE.Group()
      scene.add(group)

      currentRingCount = Math.round(paramValues['ringCount'] ?? 100)
      const ringSegs = Math.round(paramValues['ringSegments'] ?? 16)

      instancedMesh = buildMesh(currentRingCount, ringSegs)
      group.add(instancedMesh)

      // Position camera inside tunnel
      if (camera) {
        camera.position.set(0, 0, 5)
        camera.lookAt(0, 0, -10)
      }
    },

    update(dt: number, patchbay: Patchbay) {
      if (!instancedMesh || !group) return
      elapsed += dt

      const speedParam  = (paramValues['speed'] ?? 30) / 100
      const speedVal    = Math.max(0, speedParam + patchbay.get('tSpeed'))
      const radiusMod   = patchbay.get('tRadius')
      const twistMod    = patchbay.get('tTwist')
      const gapMod      = patchbay.get('tRingGap') * 2
      const pulseMod    = patchbay.get('tPulse')

      // Scroll camera forward
      if (camera) {
        camera.position.z -= speedVal * dt * 5
        // Wrap camera
        const totalLength = currentRingCount * (2.0 + gapMod)
        if (camera.position.z < -totalLength) {
          camera.position.z += totalLength
        }
      }

      updateRingPositions(instancedMesh, currentRingCount, elapsed * speedVal * 5, radiusMod + pulseMod, twistMod, gapMod)

      // Hue cycling
      _color.setHSL(0.5, 0.9, 0.5)
      _color.getHSL(_hsl)
      let h = _hsl.h + patchbay.get('tHue') + elapsed * 0.05
      if (h > 1) h -= Math.floor(h)
      if (h < 0) h += Math.ceil(-h)

      if (toggleValues['colorRings']) {
        for (let i = 0; i < currentRingCount; i++) {
          const ringH = (h + i / currentRingCount) % 1
          _color.setHSL(ringH, 0.9, 0.5)
          ringColors[i * 3]     = _color.r
          ringColors[i * 3 + 1] = _color.g
          ringColors[i * 3 + 2] = _color.b
        }
        const colorAttr = instancedMesh.geometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute
        colorAttr.needsUpdate = true
      }

      // Sync material toggles
      const mat = instancedMesh.material as THREE.MeshBasicMaterial
      mat.wireframe = toggleValues['wireframe'] ?? true
      mat.opacity   = (toggleValues['glow'] ?? true) ? 0.9 : 0.5
    },

    resize(_width: number, _height: number) { /* camera handled externally */ },

    dispose() {
      if (instancedMesh) {
        instancedMesh.geometry.dispose()
        ;(instancedMesh.material as THREE.MeshBasicMaterial).dispose()
      }
      if (group && scene) {
        scene.remove(group)
      }
      instancedMesh = null
      group = null
      scene = null
      camera = null
    },

    setOpacity(opacity: number) {
      if (instancedMesh) {
        const mat = instancedMesh.material as THREE.MeshBasicMaterial
        mat.opacity = opacity
        mat.transparent = opacity < 1
      }
    },
  }
}
