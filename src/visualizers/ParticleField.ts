import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'

// ── Pre-allocated temporaries (zero GC in render loop) ──
const _color = new THREE.Color()
const _hsl = { h: 0, s: 0, l: 0 }

// ── Destination definitions ──
export const PARTICLE_FIELD_DESTINATIONS: Destination[] = [
  { id: 'pSize',       label: 'Size',       group: 'Particle', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0,  colorIndex: 2 },
  { id: 'pSpeed',      label: 'Speed',      group: 'Particle', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0,  colorIndex: 2 },
  { id: 'pSpread',     label: 'Spread',     group: 'Particle', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0,  colorIndex: 2 },
  { id: 'pGravity',    label: 'Gravity',    group: 'Particle', defaultSource: 'none', defaultAmount: 0, min: -1.0, max: 1.0,  colorIndex: 2 },
  { id: 'pTurbulence', label: 'Turbulence', group: 'Particle', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0,  colorIndex: 2 },
  { id: 'pHue',        label: 'Hue',        group: 'Color',    defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5,  colorIndex: 3 },
  { id: 'pSat',        label: 'Saturation', group: 'Color',    defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5,  colorIndex: 3 },
  { id: 'pBrt',        label: 'Brightness', group: 'Color',    defaultSource: 'none', defaultAmount: 0, min: -0.3, max: 0.3,  colorIndex: 3 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'count',       label: 'Count',       type: 'slider', min: 0,   max: 100, default: 20,  group: 'Particles' },
  { id: 'size',        label: 'Size',        type: 'slider', min: 1,   max: 100, default: 30,  group: 'Particles' },
  { id: 'speed',       label: 'Speed',       type: 'slider', min: 0,   max: 100, default: 30,  group: 'Particles' },
  { id: 'spread',      label: 'Spread',      type: 'slider', min: 1,   max: 100, default: 50,  group: 'Particles' },
  { id: 'gravity',     label: 'Gravity',     type: 'slider', min: 0,   max: 100, default: 10,  group: 'Physics' },
  { id: 'turbulence',  label: 'Turbulence',  type: 'slider', min: 0,   max: 100, default: 20,  group: 'Physics' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'trails',          label: 'Trails',           default: false },
  { id: 'colorByVelocity', label: 'Color by Velocity', default: true  },
  { id: 'audioForces',     label: 'Audio Forces',      default: true  },
]

// Vertex shader: applies audio forces, gravity, turbulence per instance
const VERT = /* glsl */`
  attribute vec3 offset;
  attribute vec3 velocity;
  attribute float seed;

  uniform float time;
  uniform float size;
  uniform float turbulence;
  uniform bool colorByVelocity;

  varying vec3 vVelocity;
  varying float vSeed;

  void main() {
    vVelocity = velocity;
    vSeed = seed;

    vec3 pos = offset + position;

    // turbulence displacement
    float t = time * 0.5 + seed * 6.2831;
    pos.x += sin(t * 1.3 + pos.z * 0.4) * turbulence * 2.0;
    pos.y += cos(t * 0.9 + pos.x * 0.4) * turbulence * 1.5;
    pos.z += sin(t * 1.1 + pos.y * 0.4) * turbulence * 2.0;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (200.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`

// Fragment shader: soft glow falloff
const FRAG = /* glsl */`
  uniform vec3 color;
  uniform float opacity;
  varying vec3 vVelocity;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = opacity * (1.0 - d * 2.0);
    alpha = alpha * alpha; // softer glow
    gl_FragColor = vec4(color, alpha);
  }
`

const MAX_COUNT = 500000

export function createParticleField(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}

  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let mesh: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
  let scene: THREE.Scene | null = null
  let elapsed = 0
  let currentCount = 0

  // Pre-allocated typed arrays — sized for max
  const offsets    = new Float32Array(MAX_COUNT * 3)
  const velocities = new Float32Array(MAX_COUNT * 3)
  const seeds      = new Float32Array(MAX_COUNT)

  function buildGeometry(count: number): THREE.BufferGeometry {
    const spread = (paramValues['spread'] ?? 50) / 50 * 50
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      offsets[i3]     = (Math.random() - 0.5) * spread * 2
      offsets[i3 + 1] = (Math.random() - 0.5) * spread * 2
      offsets[i3 + 2] = (Math.random() - 0.5) * spread * 2
      velocities[i3]     = (Math.random() - 0.5) * 0.1
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.1
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1
      seeds[i] = Math.random()
    }

    const geo = new THREE.BufferGeometry()
    // Single point as base
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))

    const offsetAttr    = new THREE.InstancedBufferAttribute(offsets.slice(0, count * 3), 3)
    const velocityAttr  = new THREE.InstancedBufferAttribute(velocities.slice(0, count * 3), 3)
    const seedAttr      = new THREE.InstancedBufferAttribute(seeds.slice(0, count), 1)

    geo.setAttribute('offset',   offsetAttr)
    geo.setAttribute('velocity', velocityAttr)
    geo.setAttribute('seed',     seedAttr)

    return geo
  }

  return {
    id: 'particle-field',
    name: 'Partikelfeld',
    category: '3d',
    description: 'GPU-instanced Partikelfeld mit bis zu 500k Partikeln',
    params: PARAMS,
    toggles: TOGGLES,

    init(context: VisualizerContext) {
      scene = context.scene

      const rawCount = paramValues['count'] ?? 20
      currentCount = Math.max(1000, Math.round((rawCount / 100) * MAX_COUNT))

      const geo = buildGeometry(currentCount)

      _color.setHSL(0.6, 0.8, 0.6)
      _color.getHSL(_hsl)

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          time:        { value: 0 },
          size:        { value: (paramValues['size'] ?? 30) / 100 * 3 },
          turbulence:  { value: (paramValues['turbulence'] ?? 20) / 100 },
          color:       { value: new THREE.Color().setHSL(_hsl.h, _hsl.s, _hsl.l) },
          opacity:     { value: 1.0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      mesh = new THREE.Points(geo, mat)
      scene.add(mesh)
    },

    update(dt: number, patchbay: Patchbay) {
      if (!mesh) return
      elapsed += dt

      const uniforms = mesh.material.uniforms

      const sizeParam   = (paramValues['size'] ?? 30) / 100 * 3
      const speedParam  = (paramValues['speed'] ?? 30) / 100
      const gravParam   = (paramValues['gravity'] ?? 10) / 100
      const turbParam   = (paramValues['turbulence'] ?? 20) / 100

      const sizeVal  = sizeParam  + patchbay.get('pSize')
      const speedVal = speedParam + patchbay.get('pSpeed')
      const gravVal  = gravParam  + patchbay.get('pGravity')
      const turbVal  = turbParam  + patchbay.get('pTurbulence')

      uniforms['time']!.value       = elapsed
      uniforms['size']!.value       = Math.max(0.01, sizeVal)
      uniforms['turbulence']!.value = Math.max(0, turbVal)

      // Update offsets (move particles by velocity + gravity)
      const geo = mesh.geometry
      const offsetAttr = geo.getAttribute('offset') as THREE.InstancedBufferAttribute
      const velocityAttr = geo.getAttribute('velocity') as THREE.InstancedBufferAttribute
      const count = offsetAttr.count

      const spread = ((paramValues['spread'] ?? 50) / 50 * 50) + patchbay.get('pSpread') * 50

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        let ox = offsetAttr.getX(i)
        let oy = offsetAttr.getY(i)
        let oz = offsetAttr.getZ(i)
        const vx = velocityAttr.getX(i)
        const vy = velocityAttr.getY(i)
        const vz = velocityAttr.getZ(i)

        ox += vx * speedVal * dt * 10
        oy += (vy - gravVal * 0.1) * speedVal * dt * 10
        oz += vz * speedVal * dt * 10

        // Wrap around spread bounds
        const bound = spread
        if (ox >  bound) ox -= bound * 2
        if (ox < -bound) ox += bound * 2
        if (oy >  bound) oy -= bound * 2
        if (oy < -bound) oy += bound * 2
        if (oz >  bound) oz -= bound * 2
        if (oz < -bound) oz += bound * 2

        offsetAttr.setXYZ(i, ox, oy, oz)
      }
      offsetAttr.needsUpdate = true

      // Color modulation
      _color.setHSL(0.6, 0.8, 0.6)
      _color.getHSL(_hsl)
      let h = _hsl.h + patchbay.get('pHue')
      if (h > 1) h -= Math.floor(h)
      if (h < 0) h += Math.ceil(-h)
      const s = Math.max(0, Math.min(1, _hsl.s + patchbay.get('pSat')))
      const l = Math.max(0, Math.min(1, _hsl.l + patchbay.get('pBrt')))
      ;(uniforms['color']!.value as THREE.Color).setHSL(h, s, l)

      void speedVal
      void gravVal
    },

    resize(_width: number, _height: number) { /* camera handled externally */ },

    dispose() {
      if (mesh && scene) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
        mesh = null
      }
      scene = null
    },

    setOpacity(opacity: number) {
      if (mesh) mesh.material.uniforms['opacity']!.value = opacity
    },
  }
}
