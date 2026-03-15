import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'
import type { AudioAnalyser } from '@input/AudioAnalyser'

const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

// Lissajous renders the trace by drawing line segments between successive
// (X, Y) sample pairs stored in a 1D texture.
const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;

uniform sampler2D uTrail;   // 1 x TRAIL_LEN RGBA: xy = position, z = age 0..1, w = unused
uniform int   uTrailLen;
uniform float uLineWidth;
uniform float uHue;
uniform float uGlow;
uniform bool  uGlowEnabled;
uniform bool  uFade;
uniform bool  uMultiColor;
uniform float uOpacity;
uniform float uTime;

#define TRAIL_LEN 256

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float hp = mod(h * 6.0, 6.0);
  float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
  vec3 rgb;
  if (hp < 1.0) rgb = vec3(c, x, 0.0);
  else if (hp < 2.0) rgb = vec3(x, c, 0.0);
  else if (hp < 3.0) rgb = vec3(0.0, c, x);
  else if (hp < 4.0) rgb = vec3(0.0, x, c);
  else if (hp < 5.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);
  return rgb + (l - c * 0.5);
}

// Distance from point p to segment ab
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
  return length(p - (a + t * ab));
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0; // -1..1

  float alpha = 0.0;
  vec3 col = vec3(0.0);
  float lw = uLineWidth * 0.008;

  int len = min(uTrailLen, TRAIL_LEN);

  for (int i = 1; i < TRAIL_LEN; i++) {
    if (i >= len) break;
    float t0 = float(i - 1) / float(TRAIL_LEN - 1);
    float t1 = float(i)     / float(TRAIL_LEN - 1);

    vec4 s0 = texture2D(uTrail, vec2(t0, 0.5));
    vec4 s1 = texture2D(uTrail, vec2(t1, 0.5));

    vec2 p0 = s0.xy;
    vec2 p1 = s1.xy;

    float age = float(i) / float(len); // 0=newest, 1=oldest
    float fadeA = uFade ? (1.0 - age) : 1.0;

    float d = segDist(uv, p0, p1);
    float lineA = smoothstep(lw, lw * 0.3, d) * fadeA;

    vec3 segCol;
    if (uMultiColor) {
      segCol = hsl2rgb(mod(uHue + age * 0.8, 1.0), 0.9, 0.55 + fadeA * 0.1);
    } else {
      segCol = hsl2rgb(mod(uHue, 1.0), 0.85, 0.6);
    }

    col = mix(col, segCol, lineA);
    alpha += lineA;

    if (uGlowEnabled && uGlow > 0.01) {
      float glowD = lw * 5.0 * uGlow;
      float glowA = smoothstep(glowD, glowD * 0.1, d) * 0.2 * uGlow * fadeA;
      alpha += glowA;
      col = mix(col, segCol, glowA);
    }
  }

  alpha = clamp(alpha, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), alpha);
}
`

export const LISSAJOUS_DESTINATIONS: Destination[] = [
  { id: 'ljFreqX', label: 'Freq X',     group: 'Lissajous', defaultSource: 'none', defaultAmount: 0, min: -2,   max: 2,   colorIndex: 9 },
  { id: 'ljFreqY', label: 'Freq Y',     group: 'Lissajous', defaultSource: 'none', defaultAmount: 0, min: -2,   max: 2,   colorIndex: 9 },
  { id: 'ljPhase', label: 'Phase',      group: 'Lissajous', defaultSource: 'none', defaultAmount: 0, min: -1,   max: 1,   colorIndex: 9 },
  { id: 'ljGlow',  label: 'Glow',       group: 'Lissajous', defaultSource: 'none', defaultAmount: 0, min: -1,   max: 1,   colorIndex: 9 },
  { id: 'ljHue',   label: 'Hue',        group: 'Lissajous', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 9 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'freqX',       label: 'Freq X',       type: 'slider', min: 1,   max: 10,  default: 3,  group: 'Lissajous' },
  { id: 'freqY',       label: 'Freq Y',       type: 'slider', min: 1,   max: 10,  default: 2,  group: 'Lissajous' },
  { id: 'phase',       label: 'Phase',        type: 'slider', min: 0,   max: 100, default: 25, group: 'Lissajous' },
  { id: 'trailLength', label: 'Trail Length', type: 'slider', min: 16,  max: 256, default: 128, group: 'Lissajous' },
  { id: 'lineWidth',   label: 'Line Width',   type: 'slider', min: 1,   max: 10,  default: 3,  group: 'Darstellung' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'glow',       label: 'Glow',        default: true },
  { id: 'fade',       label: 'Fade',        default: true },
  { id: 'multiColor', label: 'Multi Color', default: false },
]

const TRAIL_LEN = 256

export function createLissajous(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}
  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let scene: THREE.Scene | null = null
  let camera: THREE.OrthographicCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  let material: THREE.ShaderMaterial | null = null
  let trailTex: THREE.DataTexture | null = null
  // RGBA (4 components): xy = position, z = age, w = unused
  let trailData: Float32Array | null = null
  let analyser: AudioAnalyser | null = null
  let elapsed = 0
  // Ring buffer index for trail
  let writeIdx = 0

  const viz: Visualizer & { __scene: THREE.Scene | null; __camera: THREE.OrthographicCamera | null } = {
    id: 'lissajous',
    name: 'Lissajous',
    category: '2d',
    description: 'XY-Oszilloskop mit Lissajous-Figuren und Nachleucht-Spur',
    params: PARAMS,
    toggles: TOGGLES,
    __scene: null,
    __camera: null,

    init(ctx: VisualizerContext) {
      renderer = ctx.renderer
      scene = new THREE.Scene()
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      viz.__scene = scene
      viz.__camera = camera

      trailData = new Float32Array(TRAIL_LEN * 4).fill(0)
      trailTex = new THREE.DataTexture(
        trailData, TRAIL_LEN, 1, THREE.RGBAFormat, THREE.FloatType,
      )
      trailTex.needsUpdate = true

      material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTrail:       { value: trailTex },
          uTrailLen:    { value: paramValues['trailLength'] ?? 128 },
          uLineWidth:   { value: paramValues['lineWidth'] ?? 3 },
          uHue:         { value: 0.0 },
          uGlow:        { value: 1.0 },
          uGlowEnabled: { value: true },
          uFade:        { value: true },
          uMultiColor:  { value: false },
          uOpacity:     { value: 1.0 },
          uTime:        { value: 0.0 },
        },
      })

      mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
      scene.add(mesh)

      if (typeof window !== 'undefined') {
        const w = window as unknown as { __synoptikAnalyser?: AudioAnalyser }
        analyser = w.__synoptikAnalyser ?? null
      }
    },

    update(dt: number, patchbay: Patchbay) {
      if (!material || !trailData || !trailTex) return
      elapsed += dt

      // Re-check analyser each frame (may become available later)
      if (!analyser && typeof window !== 'undefined') {
        const w = window as unknown as { __synoptikAnalyser?: AudioAnalyser }
        analyser = w.__synoptikAnalyser ?? null
      }

      // Read shared vizParams for Form Tab settings
      const vp = typeof window !== 'undefined'
        ? (window as unknown as { __synoptikVizParams?: Record<string, number> }).__synoptikVizParams
        : undefined
      const vt = typeof window !== 'undefined'
        ? (window as unknown as { __synoptikVizToggles?: Record<string, boolean> }).__synoptikVizToggles
        : undefined

      if (vp) {
        if (vp['freqX'] !== undefined) paramValues['freqX'] = vp['freqX']
        if (vp['freqY'] !== undefined) paramValues['freqY'] = vp['freqY']
        if (vp['phase'] !== undefined) paramValues['phase'] = vp['phase']
        if (vp['trailLength'] !== undefined) paramValues['trailLength'] = vp['trailLength']
        if (vp['lineWidth'] !== undefined) paramValues['lineWidth'] = vp['lineWidth']
      }
      if (vt) {
        if (vt['glow'] !== undefined) toggleValues['glow'] = vt['glow']
        if (vt['fade'] !== undefined) toggleValues['fade'] = vt['fade']
        if (vt['multiColor'] !== undefined) toggleValues['multiColor'] = vt['multiColor']
      }

      const freqX = (paramValues['freqX'] ?? 3) + patchbay.get('ljFreqX')
      const freqY = (paramValues['freqY'] ?? 2) + patchbay.get('ljFreqY')
      const phase = ((paramValues['phase'] ?? 25) / 100) * Math.PI + patchbay.get('ljPhase') * Math.PI
      const trailLen = Math.round(paramValues['trailLength'] ?? 128)

      let x = 0
      let y = 0

      if (analyser) {
        // Use actual audio time-domain data for X/Y
        const tdData = analyser.getTimeDomainData()
        const half = Math.floor(tdData.length / 2)
        const idx = (writeIdx * 2) % tdData.length
        // Convert from 0-255 (centered at 128) to -1..1
        x = ((tdData[idx] ?? 128) - 128) / 128
        y = ((tdData[(idx + half) % tdData.length] ?? 128) - 128) / 128
      } else {
        // Lissajous figure from math
        x = Math.sin(freqX * elapsed + phase)
        y = Math.sin(freqY * elapsed)
      }

      // Write to ring buffer
      const base = writeIdx * 4
      trailData[base]     = x
      trailData[base + 1] = y
      trailData[base + 2] = 0  // age — computed in shader from index
      trailData[base + 3] = 0
      writeIdx = (writeIdx + 1) % TRAIL_LEN

      // Re-order trail so newest is at index 0 (write from writeIdx backwards)
      const ordered = new Float32Array(TRAIL_LEN * 4)
      for (let i = 0; i < TRAIL_LEN; i++) {
        const src = ((writeIdx - 1 - i + TRAIL_LEN) % TRAIL_LEN) * 4
        const dst = i * 4
        ordered[dst]     = trailData[src] ?? 0
        ordered[dst + 1] = trailData[src + 1] ?? 0
        ordered[dst + 2] = trailData[src + 2] ?? 0
        ordered[dst + 3] = trailData[src + 3] ?? 0
      }
      trailTex.image.data = ordered
      trailTex.needsUpdate = true

      const hueShift = vp ? ((vp['hueShift'] ?? 0) / 360) : 0

      const u = material.uniforms
      u['uTrailLen']!.value  = Math.min(trailLen, TRAIL_LEN)
      u['uLineWidth']!.value = paramValues['lineWidth'] ?? 3
      u['uHue']!.value       = hueShift + patchbay.get('ljHue')
      u['uGlow']!.value      = Math.max(0, 1.0 + patchbay.get('ljGlow'))
      u['uGlowEnabled']!.value = toggleValues['glow'] ?? true
      u['uFade']!.value      = toggleValues['fade'] ?? true
      u['uMultiColor']!.value = toggleValues['multiColor'] ?? false
      u['uTime']!.value      = elapsed
      // 2D visualizer: don't render here — main pipeline renders __scene/__camera
    },

    resize(_w: number, _h: number) { void _w; void _h },

    dispose() {
      mesh?.geometry.dispose()
      material?.dispose()
      trailTex?.dispose()
      if (scene && mesh) scene.remove(mesh)
      mesh = null; material = null; trailTex = null
      trailData = null; scene = null; camera = null; renderer = null
      viz.__scene = null; viz.__camera = null
    },

    setOpacity(opacity: number) {
      if (material) material.uniforms['uOpacity']!.value = opacity
    },
  }

  return viz
}
