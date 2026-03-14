import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'

// ── Pre-allocated temporaries (zero GC in render loop) ──
const _color = new THREE.Color()
const _hsl = { h: 0, s: 0, l: 0 }

// ── Destination definitions ──
export const TERRAIN_DESTINATIONS: Destination[] = [
  { id: 'terrHeight', label: 'Height Scale', group: 'Terrain', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0,  colorIndex: 2 },
  { id: 'terrSpeed',  label: 'Scroll Speed', group: 'Terrain', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0,  colorIndex: 2 },
  { id: 'terrHue',    label: 'Hue',          group: 'Color',   defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5,  colorIndex: 3 },
  { id: 'terrFog',    label: 'Fog Density',  group: 'Terrain', defaultSource: 'none', defaultAmount: 0, min:  0.0, max: 0.1,  colorIndex: 5 },
  { id: 'terrNoise',  label: 'Noise Scale',  group: 'Terrain', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0,  colorIndex: 2 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'resolution',   label: 'Resolution',   type: 'slider', min: 10, max: 200, default: 80,  group: 'Terrain' },
  { id: 'heightScale',  label: 'Height Scale', type: 'slider', min: 1,  max: 100, default: 30,  group: 'Terrain' },
  { id: 'scrollSpeed',  label: 'Scroll Speed', type: 'slider', min: 0,  max: 100, default: 20,  group: 'Terrain' },
  { id: 'noiseScale',   label: 'Noise Scale',  type: 'slider', min: 1,  max: 100, default: 30,  group: 'Terrain' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'wireframe',  label: 'Wireframe',    default: true  },
  { id: 'fog',        label: 'Fog',          default: true  },
  { id: 'waterPlane', label: 'Water Plane',  default: false },
]

// Vertex shader: displaces Y based on noise + audio bands
const VERT = /* glsl */`
  uniform float time;
  uniform float heightScale;
  uniform float noiseScale;
  uniform float audioLow;
  uniform float audioMid;
  uniform float audioHigh;

  varying float vHeight;
  varying vec2 vUv;

  // Simple value noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vUv = uv;
    vec2 noisePos = position.xz * noiseScale * 0.1 + vec2(time * 0.2, 0.0);
    float h = fbm(noisePos);
    // Audio contribution
    h += audioLow  * sin(position.x * 0.5 + time * 2.0) * 0.5;
    h += audioMid  * sin(position.z * 0.8 + time * 3.0) * 0.3;
    h += audioHigh * sin(position.x * 2.0 + position.z * 2.0 + time * 5.0) * 0.1;

    float y = h * heightScale;
    vHeight = y / max(heightScale, 0.001);

    vec3 displaced = vec3(position.x, y, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const FRAG = /* glsl */`
  uniform vec3 colorLow;
  uniform vec3 colorHigh;
  uniform float fogDensity;
  uniform float opacity;

  varying float vHeight;
  varying vec2 vUv;

  void main() {
    float t = clamp(vHeight, 0.0, 1.0);
    vec3 col = mix(colorLow, colorHigh, t);
    // Simple distance fog approximation via gl_FragCoord
    float fog = 1.0 - exp(-fogDensity * gl_FragCoord.z / gl_FragCoord.w * 0.1);
    col = mix(col, vec3(0.0), clamp(fog, 0.0, 1.0));
    gl_FragColor = vec4(col, opacity);
  }
`

export function createTerrain(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}

  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let terrainMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  let waterMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null
  let group: THREE.Group | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let elapsed = 0

  function buildTerrain(res: number): THREE.PlaneGeometry {
    const geo = new THREE.PlaneGeometry(100, 100, res, res)
    // Rotate to XZ plane
    geo.rotateX(-Math.PI / 2)
    return geo
  }

  return {
    id: 'terrain',
    name: 'Terrain',
    category: '3d',
    description: 'Unendlich scrollendes Terrain mit audio-getriebenem Heightmap',
    params: PARAMS,
    toggles: TOGGLES,

    init(context: VisualizerContext) {
      scene = context.scene
      camera = context.camera

      group = new THREE.Group()
      scene.add(group)

      const res = Math.round(paramValues['resolution'] ?? 80)
      const geo = buildTerrain(res)

      const heightScale = (paramValues['heightScale'] ?? 30) / 100 * 20
      const noiseScale  = (paramValues['noiseScale'] ?? 30) / 100 * 5

      _color.setHSL(0.35, 0.8, 0.25)
      _color.getHSL(_hsl)
      const colorLow  = new THREE.Color().setHSL(_hsl.h, _hsl.s, _hsl.l)

      _color.setHSL(0.15, 0.5, 0.6)
      const colorHigh = new THREE.Color().copy(_color)

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          time:        { value: 0 },
          heightScale: { value: heightScale },
          noiseScale:  { value: noiseScale },
          audioLow:    { value: 0 },
          audioMid:    { value: 0 },
          audioHigh:   { value: 0 },
          colorLow:    { value: colorLow },
          colorHigh:   { value: colorHigh },
          fogDensity:  { value: toggleValues['fog'] ? 1.0 : 0.0 },
          opacity:     { value: 1.0 },
        },
        wireframe: toggleValues['wireframe'] ?? true,
        transparent: true,
        side: THREE.DoubleSide,
      })

      terrainMesh = new THREE.Mesh(geo, mat)
      group.add(terrainMesh)

      // Water plane
      const waterGeo = new THREE.PlaneGeometry(100, 100)
      waterGeo.rotateX(-Math.PI / 2)
      const waterMat = new THREE.MeshBasicMaterial({
        color: 0x003366,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
      waterMesh = new THREE.Mesh(waterGeo, waterMat)
      waterMesh.position.y = heightScale * 0.15
      waterMesh.visible = toggleValues['waterPlane'] ?? false
      group.add(waterMesh)

      // Camera above terrain looking forward
      if (camera) {
        camera.position.set(0, 15, 40)
        camera.lookAt(0, 0, 0)
      }
    },

    update(dt: number, patchbay: Patchbay) {
      if (!terrainMesh) return
      elapsed += dt

      const speedParam  = (paramValues['scrollSpeed'] ?? 20) / 100
      const speedVal    = Math.max(0, speedParam + patchbay.get('terrSpeed'))
      const heightParam = (paramValues['heightScale'] ?? 30) / 100 * 20
      const heightVal   = Math.max(0, heightParam + patchbay.get('terrHeight') * 10)
      const noiseParam  = (paramValues['noiseScale'] ?? 30) / 100 * 5
      const noiseVal    = Math.max(0.01, noiseParam + patchbay.get('terrNoise') * 5)

      const uniforms = terrainMesh.material.uniforms
      uniforms['time']!.value        = elapsed * speedVal
      uniforms['heightScale']!.value = heightVal
      uniforms['noiseScale']!.value  = noiseVal

      // Audio bands from patchbay (destinations mapped to audio sources externally)
      uniforms['audioLow']!.value  = patchbay.get('terrHeight') > 0 ? patchbay.get('terrHeight') : 0
      uniforms['audioMid']!.value  = patchbay.get('terrNoise')  > 0 ? patchbay.get('terrNoise')  : 0
      uniforms['audioHigh']!.value = patchbay.get('terrSpeed')  > 0 ? patchbay.get('terrSpeed')  : 0

      // Fog
      const fogParam = toggleValues['fog'] ? 1.0 : 0.0
      uniforms['fogDensity']!.value = Math.max(0, fogParam + patchbay.get('terrFog') * 10)

      // Color modulation
      _color.setHSL(0.35, 0.8, 0.25)
      _color.getHSL(_hsl)
      let h = _hsl.h + patchbay.get('terrHue')
      if (h > 1) h -= Math.floor(h)
      if (h < 0) h += Math.ceil(-h)
      ;(uniforms['colorLow']!.value as THREE.Color).setHSL(h, _hsl.s, _hsl.l)
      ;(uniforms['colorHigh']!.value as THREE.Color).setHSL((h + 0.1) % 1, 0.5, 0.6)

      // Toggle sync
      terrainMesh.material.wireframe = toggleValues['wireframe'] ?? true
      if (waterMesh) waterMesh.visible = toggleValues['waterPlane'] ?? false
    },

    resize(_width: number, _height: number) { /* camera handled externally */ },

    dispose() {
      if (terrainMesh) {
        terrainMesh.geometry.dispose()
        terrainMesh.material.dispose()
      }
      if (waterMesh) {
        waterMesh.geometry.dispose()
        waterMesh.material.dispose()
      }
      if (group && scene) {
        scene.remove(group)
      }
      terrainMesh = null
      waterMesh = null
      group = null
      scene = null
      camera = null
    },

    setOpacity(opacity: number) {
      if (terrainMesh) terrainMesh.material.uniforms['opacity']!.value = opacity
    },
  }
}
