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

uniform sampler2D uSpectrum;
uniform float uBarCount;
uniform float uBarWidth;  // 0-1
uniform float uGap;       // 0-1
uniform int   uLayout;    // 0=linear, 1=radial, 2=mirror
uniform bool  uRounded;
uniform bool  uReflection;
uniform bool  uColorPerBar;
uniform float uHue;
uniform float uHeight;    // modulation
uniform float uOpacity;
uniform float uTime;

#define PI 3.14159265359

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

float sampleSpectrum(float t) {
  return texture2D(uSpectrum, vec2(clamp(t, 0.0, 1.0), 0.5)).r;
}

// Returns alpha for a single bar at barIndex
float linearBar(vec2 uv, float barIndex, float barAmp) {
  float totalBars = uBarCount;
  float cellW = 1.0 / totalBars;
  float gapFrac = uGap * 0.8;
  float barFrac = uBarWidth * (1.0 - gapFrac);
  float barStart = barIndex * cellW + cellW * (1.0 - barFrac) * 0.5;
  float barEnd   = barStart + cellW * barFrac;

  if (uv.x < barStart || uv.x > barEnd) return 0.0;

  float barHeight = barAmp * 0.95 * uHeight;

  float a = 0.0;
  if (uLayout == 2) {
    // mirror: bars grow from center
    float cy = 0.5;
    float top = cy + barHeight * 0.5;
    float bot = cy - barHeight * 0.5;
    if (uv.y > bot && uv.y < top) {
      if (uRounded) {
        float xInBar = (uv.x - barStart) / (barEnd - barStart);
        float xR = min(xInBar, 1.0 - xInBar) * 2.0;
        float yR = min((uv.y - bot) / (barHeight * 0.08 + 0.001),
                       (top - uv.y)  / (barHeight * 0.08 + 0.001));
        a = smoothstep(0.0, 1.0, min(xR, yR));
      } else {
        a = 1.0;
      }
    }
  } else {
    // linear: bars grow from bottom
    if (uv.y < barHeight) {
      if (uRounded) {
        float xInBar = (uv.x - barStart) / (barEnd - barStart);
        float xR = min(xInBar, 1.0 - xInBar) * 2.0;
        float yR = (barHeight - uv.y) / max(barHeight * 0.08, 0.001);
        a = smoothstep(0.0, 1.0, min(xR * 4.0, yR));
      } else {
        a = 1.0;
      }
      if (uReflection) {
        // fade bottom edge reflection effect
        a *= mix(1.0, 0.3, 1.0 - uv.y / max(barHeight, 0.001));
      }
    }
  }
  return a;
}

void main() {
  vec2 uv = vUv;
  float alpha = 0.0;
  vec3 col = vec3(0.0);

  if (uLayout == 1) {
    // Radial layout
    vec2 centered = uv * 2.0 - 1.0;
    float angle = atan(centered.y, centered.x);
    float normAngle = (angle + PI) / (2.0 * PI); // 0..1
    float radius = length(centered);

    float barIdx = floor(normAngle * uBarCount);
    float barFrac = normAngle * uBarCount - barIdx;
    float specT = barIdx / uBarCount;
    float amp = sampleSpectrum(specT);

    float innerR = 0.25;
    float outerR = innerR + amp * 0.6 * uHeight;
    float cellAngle = 2.0 * PI / uBarCount;
    float gapAngle = cellAngle * uGap * 0.4;
    float barAngle = cellAngle - gapAngle;
    float fracInBar = barFrac * (2.0 * PI / uBarCount) / cellAngle;

    if (fracInBar > (gapAngle / cellAngle) * 0.5 &&
        fracInBar < 1.0 - (gapAngle / cellAngle) * 0.5 &&
        radius > innerR && radius < outerR) {
      alpha = 1.0;
      if (uColorPerBar) {
        col = hsl2rgb(mod(uHue + barIdx / uBarCount, 1.0), 0.9, 0.55);
      } else {
        col = hsl2rgb(mod(uHue + amp * 0.3, 1.0), 0.85, 0.5 + amp * 0.2);
      }
    }
  } else {
    // Linear or mirror
    float totalBars = uBarCount;
    float barIdx = floor(uv.x * totalBars);
    float specT = barIdx / totalBars;
    float amp = sampleSpectrum(specT);

    alpha = linearBar(uv, barIdx, amp);
    if (alpha > 0.0) {
      if (uColorPerBar) {
        col = hsl2rgb(mod(uHue + barIdx / totalBars * 0.7, 1.0), 0.85, 0.55);
      } else {
        col = hsl2rgb(mod(uHue + amp * 0.4, 1.0), 0.85, 0.45 + amp * 0.3);
      }
    }

    // Reflection
    if (uReflection && uLayout == 0) {
      float reflY = 1.0 - uv.y;
      float barH = sampleSpectrum(specT) * 0.95 * uHeight;
      if (reflY < barH * 0.5) {
        float reflAlpha = (1.0 - reflY / max(barH * 0.5, 0.001)) * 0.3;
        alpha = max(alpha, reflAlpha);
        col = mix(col, col * 0.6, 0.5);
      }
    }
  }

  alpha = clamp(alpha, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col, alpha);
}
`

export const SPECTRUM_BARS_DESTINATIONS: Destination[] = [
  { id: 'sbHeight', label: 'Height',    group: 'SpectrumBars', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.5, colorIndex: 7 },
  { id: 'sbWidth',  label: 'Bar Width', group: 'SpectrumBars', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 7 },
  { id: 'sbHue',    label: 'Hue',       group: 'SpectrumBars', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 7 },
  { id: 'sbGap',    label: 'Gap',       group: 'SpectrumBars', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 7 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'barCount', label: 'Bar Count', type: 'slider', min: 16,  max: 256, default: 64, group: 'Bars' },
  { id: 'barWidth', label: 'Bar Width', type: 'slider', min: 0,   max: 100, default: 70, group: 'Bars' },
  { id: 'gap',      label: 'Gap',       type: 'slider', min: 0,   max: 100, default: 20, group: 'Bars' },
  {
    id: 'layout', label: 'Layout', type: 'select', default: 0, group: 'Layout',
    options: [
      { value: 0, label: 'Linear' },
      { value: 1, label: 'Radial' },
      { value: 2, label: 'Mirror' },
    ],
  },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'rounded',    label: 'Rounded',      default: true },
  { id: 'reflection', label: 'Reflection',   default: false },
  { id: 'colorPerBar', label: 'Color/Bar',   default: false },
]

export function createSpectrumBars(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}
  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let scene: THREE.Scene | null = null
  let camera: THREE.OrthographicCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  let material: THREE.ShaderMaterial | null = null
  let spectrumTex: THREE.DataTexture | null = null
  let spectrumData: Float32Array | null = null
  let analyser: AudioAnalyser | null = null
  let elapsed = 0

  const viz: Visualizer & { __scene: THREE.Scene | null; __camera: THREE.OrthographicCamera | null } = {
    id: 'spectrum-bars',
    name: 'Spectrum Bars',
    category: '2d',
    description: 'Frequenz-Balken in Linear, Radial oder Mirror-Layout',
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

      spectrumData = new Float32Array(256).fill(0)
      spectrumTex = new THREE.DataTexture(
        spectrumData, 256, 1, THREE.RedFormat, THREE.FloatType,
      )
      spectrumTex.needsUpdate = true

      material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uSpectrum:    { value: spectrumTex },
          uBarCount:    { value: paramValues['barCount'] ?? 64 },
          uBarWidth:    { value: (paramValues['barWidth'] ?? 70) / 100 },
          uGap:         { value: (paramValues['gap'] ?? 20) / 100 },
          uLayout:      { value: paramValues['layout'] ?? 0 },
          uRounded:     { value: true },
          uReflection:  { value: false },
          uColorPerBar: { value: false },
          uHue:         { value: 0.0 },
          uHeight:      { value: 1.0 },
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
      if (!material || !spectrumData || !spectrumTex) return
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
        if (vp['barCount'] !== undefined) paramValues['barCount'] = vp['barCount']
        if (vp['barWidth'] !== undefined) paramValues['barWidth'] = vp['barWidth']
        if (vp['gap'] !== undefined) paramValues['gap'] = vp['gap']
        if (vp['layout'] !== undefined) paramValues['layout'] = vp['layout']
      }
      if (vt) {
        if (vt['rounded'] !== undefined) toggleValues['rounded'] = vt['rounded']
        if (vt['reflection'] !== undefined) toggleValues['reflection'] = vt['reflection']
        if (vt['colorPerBar'] !== undefined) toggleValues['colorPerBar'] = vt['colorPerBar']
      }

      if (analyser) {
        const freqData = analyser.getFrequencyData()
        const step = Math.max(1, Math.floor(freqData.length / 256))
        for (let i = 0; i < 256; i++) {
          spectrumData[i] = (freqData[i * step] ?? 0) / 255
        }
        spectrumTex.needsUpdate = true
      } else {
        // Fallback preview
        for (let i = 0; i < 256; i++) {
          const t = i / 256
          spectrumData[i] = Math.max(0, (1 - t) * 0.7 * (0.5 + 0.5 * Math.sin(t * 20 + elapsed * 3)))
        }
        spectrumTex.needsUpdate = true
      }

      const hueShift = vp ? ((vp['hueShift'] ?? 0) / 360) : 0

      const u = material.uniforms
      u['uBarCount']!.value    = Math.round(paramValues['barCount'] ?? 64)
      u['uBarWidth']!.value    = Math.max(0.05, Math.min(1, (paramValues['barWidth'] ?? 70) / 100 + patchbay.get('sbWidth')))
      u['uGap']!.value         = Math.max(0, Math.min(1, (paramValues['gap'] ?? 20) / 100 + patchbay.get('sbGap')))
      u['uLayout']!.value      = Math.round(paramValues['layout'] ?? 0)
      u['uRounded']!.value     = toggleValues['rounded'] ?? true
      u['uReflection']!.value  = toggleValues['reflection'] ?? false
      u['uColorPerBar']!.value = toggleValues['colorPerBar'] ?? false
      u['uHue']!.value         = hueShift + patchbay.get('sbHue')
      u['uHeight']!.value      = Math.max(0.01, 1.0 + patchbay.get('sbHeight'))
      u['uTime']!.value        = elapsed
      // 2D visualizer: don't render here — main pipeline renders __scene/__camera
    },

    resize(_w: number, _h: number) { void _w; void _h },

    dispose() {
      mesh?.geometry.dispose()
      material?.dispose()
      spectrumTex?.dispose()
      if (scene && mesh) scene.remove(mesh)
      mesh = null; material = null; spectrumTex = null
      spectrumData = null; scene = null; camera = null; renderer = null
      viz.__scene = null; viz.__camera = null
    },

    setOpacity(opacity: number) {
      if (material) material.uniforms['uOpacity']!.value = opacity
    },
  }

  return viz
}
