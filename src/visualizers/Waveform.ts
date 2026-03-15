import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'
import type { AudioAnalyser } from '@input/AudioAnalyser'

// ── Vertex shader (fullscreen quad, no transform needed) ──
const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

// ── Fragment shader ──
const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;

uniform sampler2D uWaveform;
uniform float uLineWidth;
uniform float uLayers;
uniform float uSmoothing;
uniform float uAmplitude;
uniform float uHue;
uniform float uGlow;
uniform bool uGlowEnabled;
uniform bool uFill;
uniform bool uGradient;
uniform bool uMirror;
uniform float uTime;
uniform float uOpacity;

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
  float m = l - c * 0.5;
  return rgb + m;
}

float sampleWaveform(float x) {
  float raw = texture2D(uWaveform, vec2(clamp(x, 0.0, 1.0), 0.5)).r;
  return (raw - 0.5) * 2.0 * uAmplitude;
}

float drawLine(float y, float waveY, float width) {
  float d = abs(y - waveY);
  return smoothstep(width, width * 0.3, d);
}

void main() {
  vec2 uv = vUv;
  float y = uv.y * 2.0 - 1.0;
  float x = uv.x;

  float alpha = 0.0;
  vec3 col = vec3(0.0);
  int iLayers = int(uLayers);

  for (int i = 0; i < 5; i++) {
    if (i >= iLayers) break;
    float fi = float(i);
    float layerFrac = float(i) / max(float(iLayers) - 1.0, 1.0);

    // Smooth the waveform by blending neighboring samples
    float smear = uSmoothing * 0.01;
    float waveY = 0.0;
    float wsum = 0.0;
    for (int k = -3; k <= 3; k++) {
      float kf = float(k);
      float wx = exp(-kf * kf / max(smear * 20.0 + 0.1, 0.1));
      waveY += sampleWaveform(x + kf * smear * 0.02) * wx;
      wsum += wx;
    }
    waveY /= wsum;

    if (uMirror) {
      waveY *= (i % 2 == 0 ? 1.0 : -1.0);
    }

    float layerOffset = uMirror ? 0.0 : (layerFrac - 0.5) * 0.6;
    waveY = waveY * (1.0 - layerFrac * 0.3) + layerOffset;

    float lw = uLineWidth * 0.003 * (1.0 - layerFrac * 0.5);
    float lineAlpha = drawLine(y, waveY, lw);

    float h = mod(uHue + layerFrac * 0.3, 1.0);
    vec3 layerCol = uGradient
      ? hsl2rgb(mod(h + x * 0.3, 1.0), 0.8, 0.6)
      : hsl2rgb(h, 0.8, 0.55 + layerFrac * 0.1);

    if (uFill) {
      float fillAlpha = step(waveY, y) * 0.15 * (1.0 - layerFrac * 0.5);
      alpha += fillAlpha;
      col = mix(col, layerCol, fillAlpha);
    }

    alpha += lineAlpha * (1.0 - layerFrac * 0.4);
    col = mix(col, layerCol, lineAlpha);

    if (uGlowEnabled) {
      float glowR = lw * 6.0 * uGlow;
      float glowA = drawLine(y, waveY, glowR) * 0.25 * uGlow;
      col = mix(col, layerCol, glowA * 0.5);
      alpha += glowA;
    }
  }

  alpha = clamp(alpha, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col, alpha);
}
`

// ── Destinations ──
export const WAVEFORM_DESTINATIONS: Destination[] = [
  { id: 'wfWidth',     label: 'Line Width',  group: 'Waveform', defaultSource: 'none', defaultAmount: 0, min: -5,   max: 5,   colorIndex: 6 },
  { id: 'wfGlow',      label: 'Glow',        group: 'Waveform', defaultSource: 'none', defaultAmount: 0, min: -1,   max: 1,   colorIndex: 6 },
  { id: 'wfHue',       label: 'Hue',         group: 'Waveform', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 6 },
  { id: 'wfAmplitude', label: 'Amplitude',   group: 'Waveform', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 6 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'lineWidth',  label: 'Line Width', type: 'slider', min: 1,   max: 10,  default: 3,   group: 'Waveform' },
  { id: 'layers',     label: 'Layers',     type: 'slider', min: 1,   max: 5,   default: 2,   group: 'Waveform' },
  { id: 'smoothing',  label: 'Smoothing',  type: 'slider', min: 0,   max: 100, default: 30,  group: 'Waveform' },
  { id: 'layout',     label: 'Layout',     type: 'select', default: 0, group: 'Layout',
    options: [{ value: 0, label: 'Linear' }, { value: 1, label: 'Mirror' }] },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'glow',     label: 'Glow',     default: true },
  { id: 'fill',     label: 'Fill',     default: false },
  { id: 'gradient', label: 'Gradient', default: false },
]

export function createWaveform(): Visualizer {
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
  let elapsed = 0

  // External audio data hook — set by AudioEngine on window
  let analyser: AudioAnalyser | null = null

  const viz: Visualizer & { __scene: THREE.Scene | null; __camera: THREE.OrthographicCamera | null } = {
    id: 'waveform',
    name: 'Waveform',
    category: '2d',
    description: 'Klassisches Oszilloskop mit mehreren Ebenen und Glow',
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
          uWaveform:    { value: waveformTex },
          uLineWidth:   { value: paramValues['lineWidth'] ?? 3 },
          uLayers:      { value: paramValues['layers'] ?? 2 },
          uSmoothing:   { value: paramValues['smoothing'] ?? 30 },
          uAmplitude:   { value: 0.8 },
          uHue:         { value: 0.0 },
          uGlow:        { value: 1.0 },
          uGlowEnabled: { value: true },
          uFill:        { value: false },
          uGradient:    { value: false },
          uMirror:      { value: false },
          uTime:        { value: 0.0 },
          uOpacity:     { value: 1.0 },
        },
      })

      const geo = new THREE.PlaneGeometry(2, 2)
      mesh = new THREE.Mesh(geo, material)
      scene.add(mesh)

      // Try to find analyser from window (set by AudioEngine)
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

      // Sync Form Tab params to local paramValues
      if (vp) {
        if (vp['lineWidth'] !== undefined) paramValues['lineWidth'] = vp['lineWidth']
        if (vp['layers'] !== undefined) paramValues['layers'] = vp['layers']
        if (vp['smoothing'] !== undefined) paramValues['smoothing'] = vp['smoothing']
        if (vp['layout'] !== undefined) paramValues['layout'] = vp['layout']
      }
      if (vt) {
        if (vt['glow'] !== undefined) toggleValues['glow'] = vt['glow']
        if (vt['fill'] !== undefined) toggleValues['fill'] = vt['fill']
        if (vt['gradient'] !== undefined) toggleValues['gradient'] = vt['gradient']
      }

      // Update audio data
      if (analyser) {
        const tdData = analyser.getTimeDomainData()
        const step = Math.max(1, Math.floor(tdData.length / 256))
        for (let i = 0; i < 256; i++) {
          // TimeDomainData is Uint8Array centered at 128, convert to 0..1
          const raw = (tdData[i * step] ?? 128) / 255
          waveformData[i] = raw
        }
        waveformTex.needsUpdate = true
      } else {
        // Fallback: sine wave for preview
        for (let i = 0; i < 256; i++) {
          waveformData[i] = Math.sin(i / 256 * Math.PI * 4 + elapsed * 2) * 0.4 + 0.5
        }
        waveformTex.needsUpdate = true
      }

      // Apply hue shift from Form Tab
      const hueShift = vp ? ((vp['hueShift'] ?? 0) / 360) : 0

      const u = material.uniforms
      u['uLineWidth']!.value  = (paramValues['lineWidth'] ?? 3) + patchbay.get('wfWidth')
      u['uLayers']!.value     = Math.max(1, Math.min(5, Math.round(paramValues['layers'] ?? 2)))
      u['uSmoothing']!.value  = paramValues['smoothing'] ?? 30
      u['uAmplitude']!.value  = Math.max(0.05, 0.8 + patchbay.get('wfAmplitude'))
      u['uHue']!.value        = hueShift + patchbay.get('wfHue')
      u['uGlow']!.value       = Math.max(0, 1.0 + patchbay.get('wfGlow'))
      u['uGlowEnabled']!.value = toggleValues['glow'] ?? true
      u['uFill']!.value       = toggleValues['fill'] ?? false
      u['uGradient']!.value   = toggleValues['gradient'] ?? false
      u['uMirror']!.value     = (paramValues['layout'] ?? 0) === 1
      u['uTime']!.value       = elapsed
      // 2D visualizer: don't render here — main pipeline renders __scene/__camera
    },

    resize(width: number, height: number) {
      void width; void height
    },

    dispose() {
      mesh?.geometry.dispose()
      material?.dispose()
      waveformTex?.dispose()
      if (scene && mesh) scene.remove(mesh)
      mesh = null
      material = null
      waveformTex = null
      waveformData = null
      scene = null
      camera = null
      renderer = null
      viz.__scene = null
      viz.__camera = null
    },

    setOpacity(opacity: number) {
      if (material) material.uniforms['uOpacity']!.value = opacity
    },
  }

  return viz
}
