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

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;

uniform sampler2D uWaveform;
uniform float uRadius;       // 0..1 base radius fraction
uniform float uLineWidth;
uniform float uLayers;
uniform float uRotation;
uniform float uAmplitude;
uniform float uHue;
uniform bool  uFill;
uniform bool  uMirror;
uniform bool  uGlow;
uniform float uGlowAmt;
uniform float uTime;
uniform float uOpacity;

#define PI 3.14159265359
#define TAU 6.28318530718

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

float sampleWave(float normAngle) {
  float t = mod(normAngle + uRotation / TAU, 1.0);
  return texture2D(uWaveform, vec2(t, 0.5)).r * 2.0 - 1.0;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  // Adjust for aspect (assume square; caller can handle)

  float r = length(uv);
  float angle = atan(uv.y, uv.x);
  float normAngle = (angle + PI) / TAU; // 0..1

  float alpha = 0.0;
  vec3 col = vec3(0.0);

  int iLayers = int(uLayers);
  for (int layer = 0; layer < 5; layer++) {
    if (layer >= iLayers) break;
    float lf = float(layer) / max(float(iLayers) - 1.0, 1.0);

    float baseR = uRadius * (0.5 + lf * 0.1);
    float amp   = uAmplitude * (1.0 - lf * 0.3);
    float wv    = sampleWave(normAngle);

    float displacement;
    if (uMirror) {
      displacement = abs(wv) * amp;
    } else {
      displacement = wv * amp;
    }

    float waveR = baseR + displacement;
    float lw    = uLineWidth * 0.003 * (1.0 - lf * 0.3);

    float dist = abs(r - waveR);
    float lineA = smoothstep(lw, lw * 0.2, dist);

    float h = mod(uHue + lf * 0.25, 1.0);
    vec3 layerCol = hsl2rgb(h, 0.85, 0.55 + lf * 0.1);

    if (uFill && r < waveR) {
      float fillA = 0.12 * (1.0 - lf * 0.4) * smoothstep(0.0, baseR * 0.3, r);
      alpha += fillA;
      col = mix(col, layerCol, fillA);
    }

    col = mix(col, layerCol, lineA);
    alpha += lineA;

    if (uGlow && uGlowAmt > 0.01) {
      float glowR = lw * 6.0 * uGlowAmt;
      float glowA = smoothstep(glowR, 0.0, dist) * 0.25 * uGlowAmt * (1.0 - lf * 0.3);
      col = mix(col, layerCol, glowA * 0.6);
      alpha += glowA;
    }
  }

  alpha = clamp(alpha, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col, alpha);
}
`

export const CIRCULAR_WAVEFORM_DESTINATIONS: Destination[] = [
  { id: 'cwRadius',    label: 'Radius',    group: 'CircularWaveform', defaultSource: 'none', defaultAmount: 0, min: -0.3, max: 0.3,  colorIndex: 10 },
  { id: 'cwWidth',     label: 'Line Width',group: 'CircularWaveform', defaultSource: 'none', defaultAmount: 0, min: -3,   max: 5,    colorIndex: 10 },
  { id: 'cwHue',       label: 'Hue',       group: 'CircularWaveform', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5,  colorIndex: 10 },
  { id: 'cwAmplitude', label: 'Amplitude', group: 'CircularWaveform', defaultSource: 'none', defaultAmount: 0, min: -0.3, max: 0.5,  colorIndex: 10 },
  { id: 'cwRotation',  label: 'Rotation',  group: 'CircularWaveform', defaultSource: 'none', defaultAmount: 0, min: -2,   max: 2,    colorIndex: 10 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'radius',        label: 'Radius',        type: 'slider', min: 0,   max: 100, default: 55, group: 'Waveform' },
  { id: 'lineWidth',     label: 'Line Width',    type: 'slider', min: 1,   max: 10,  default: 3,  group: 'Waveform' },
  { id: 'layers',        label: 'Layers',        type: 'slider', min: 1,   max: 5,   default: 2,  group: 'Waveform' },
  { id: 'rotationSpeed', label: 'Rotation Speed',type: 'slider', min: 0,   max: 100, default: 10, group: 'Waveform' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'fill',   label: 'Fill',   default: false },
  { id: 'mirror', label: 'Mirror', default: false },
  { id: 'glow',   label: 'Glow',   default: true },
]

export function createCircularWaveform(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}
  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let scene: THREE.Scene | null = null
  let camera: THREE.OrthographicCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  let material: THREE.ShaderMaterial | null = null
  let waveformTex: THREE.DataTexture | null = null
  let waveformData: Float32Array | null = null
  let analyser: AudioAnalyser | null = null
  let elapsed = 0
  let rotation = 0

  const viz: Visualizer & { __scene: THREE.Scene | null; __camera: THREE.OrthographicCamera | null } = {
    id: 'circular-waveform',
    name: 'Circular Waveform',
    category: '2d',
    description: 'Waveform als Kreis in Polarkoordinaten',
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

      waveformData = new Float32Array(256).fill(0.5)
      waveformTex = new THREE.DataTexture(
        waveformData, 256, 1, THREE.RedFormat, THREE.FloatType,
      )
      waveformTex.needsUpdate = true

      material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uWaveform:  { value: waveformTex },
          uRadius:    { value: 0.55 },
          uLineWidth: { value: 3.0 },
          uLayers:    { value: 2.0 },
          uRotation:  { value: 0.0 },
          uAmplitude: { value: 0.15 },
          uHue:       { value: 0.0 },
          uFill:      { value: false },
          uMirror:    { value: false },
          uGlow:      { value: true },
          uGlowAmt:   { value: 1.0 },
          uTime:      { value: 0.0 },
          uOpacity:   { value: 1.0 },
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
      if (!material || !waveformData || !waveformTex) return
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
        if (vp['radius'] !== undefined) paramValues['radius'] = vp['radius']
        if (vp['lineWidth'] !== undefined) paramValues['lineWidth'] = vp['lineWidth']
        if (vp['layers'] !== undefined) paramValues['layers'] = vp['layers']
        if (vp['rotationSpeed'] !== undefined) paramValues['rotationSpeed'] = vp['rotationSpeed']
      }
      if (vt) {
        if (vt['fill'] !== undefined) toggleValues['fill'] = vt['fill']
        if (vt['mirror'] !== undefined) toggleValues['mirror'] = vt['mirror']
        if (vt['glow'] !== undefined) toggleValues['glow'] = vt['glow']
      }

      const rotSpeed = (paramValues['rotationSpeed'] ?? 10) / 100 * Math.PI * 2
      rotation += (rotSpeed + patchbay.get('cwRotation')) * dt

      // Update waveform data
      if (analyser) {
        const tdData = analyser.getTimeDomainData()
        const step = Math.max(1, Math.floor(tdData.length / 256))
        for (let i = 0; i < 256; i++) {
          // TimeDomainData is Uint8Array centered at 128, convert to 0..1
          waveformData[i] = (tdData[i * step] ?? 128) / 255
        }
        waveformTex.needsUpdate = true
      } else {
        for (let i = 0; i < 256; i++) {
          const t = i / 256
          waveformData[i] = Math.sin(t * Math.PI * 6 + elapsed * 2) * 0.35 + 0.5
        }
        waveformTex.needsUpdate = true
      }

      const hueShift = vp ? ((vp['hueShift'] ?? 0) / 360) : 0

      const u = material.uniforms
      u['uRadius']!.value    = Math.max(0.1, (paramValues['radius'] ?? 55) / 100 + patchbay.get('cwRadius'))
      u['uLineWidth']!.value = Math.max(0.5, (paramValues['lineWidth'] ?? 3) + patchbay.get('cwWidth'))
      u['uLayers']!.value    = Math.max(1, Math.round(paramValues['layers'] ?? 2))
      u['uRotation']!.value  = rotation
      u['uAmplitude']!.value = Math.max(0.01, 0.15 + patchbay.get('cwAmplitude'))
      u['uHue']!.value       = hueShift + patchbay.get('cwHue')
      u['uFill']!.value      = toggleValues['fill'] ?? false
      u['uMirror']!.value    = toggleValues['mirror'] ?? false
      u['uGlow']!.value      = toggleValues['glow'] ?? true
      u['uGlowAmt']!.value   = 1.0
      u['uTime']!.value      = elapsed
      // 2D visualizer: don't render here — main pipeline renders __scene/__camera
    },

    resize(_w: number, _h: number) { void _w; void _h },

    dispose() {
      mesh?.geometry.dispose()
      material?.dispose()
      waveformTex?.dispose()
      if (scene && mesh) scene.remove(mesh)
      mesh = null; material = null; waveformTex = null
      waveformData = null; scene = null; camera = null; renderer = null
      viz.__scene = null; viz.__camera = null
    },

    setOpacity(opacity: number) {
      if (material) material.uniforms['uOpacity']!.value = opacity
    },
  }

  return viz
}
