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

// Unified fragment shader for all 4 patterns
const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;

uniform int   uPattern;     // 0=voronoi, 1=plasma, 2=fractalFlame, 3=reactionDiffusion
uniform float uTime;
uniform float uSpeed;
uniform float uComplexity;
uniform float uZoom;
uniform float uHue;
uniform float uDistort;
uniform float uAudio;       // 0-1 audio energy
uniform bool  uAudioReactive;
uniform bool  uColorCycle;
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

// ─── Hash / noise helpers ───
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)),
           dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ─── VORONOI ───
vec3 voronoi(vec2 uv, float t, float complexity, float audio) {
  float cells = 3.0 + complexity * 6.0 + audio * 3.0;
  vec2 p = uv * cells;
  vec2 cell = floor(p);
  vec2 frac = fract(p);

  float minDist = 1e9;
  float minDist2 = 1e9;
  vec2 nearCell = vec2(0.0);

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 neighbor = vec2(float(dx), float(dy));
      vec2 fc = cell + neighbor;
      vec2 rand = hash2(fc);
      vec2 pt = neighbor + rand * 0.5 + 0.5 + 0.5 * sin(t * 0.6 + rand * TAU);
      float d = length(frac - pt);
      if (d < minDist) { minDist2 = minDist; minDist = d; nearCell = fc; }
      else if (d < minDist2) { minDist2 = d; }
    }
  }

  float edge = minDist2 - minDist;
  float cellId = hash1(nearCell);
  vec3 col = hsl2rgb(mod(cellId + t * 0.05 + audio * 0.2, 1.0), 0.7 + audio * 0.2, 0.4 + minDist * 0.4);
  col = mix(col, vec3(1.0), smoothstep(0.04, 0.0, edge));
  return col;
}

// ─── PLASMA ───
vec3 plasma(vec2 uv, float t, float complexity, float audio) {
  float c = complexity * 4.0 + 1.0;
  float v1 = sin(uv.x * c + t);
  float v2 = sin(uv.y * c + t * 1.1);
  float v3 = sin((uv.x + uv.y) * c * 0.7 + t * 0.9);
  float v4 = sin(sqrt(uv.x * uv.x + uv.y * uv.y) * c + t + audio * 4.0);
  float v  = (v1 + v2 + v3 + v4) * 0.25;

  float h = v * 0.5 + 0.5;
  return hsl2rgb(mod(h * 0.6 + t * 0.04, 1.0), 0.9, 0.5 + v * 0.2);
}

// ─── FRACTAL FLAME (iterated function system approximation) ───
vec3 fractalFlame(vec2 uv, float t, float complexity, float audio) {
  vec2 p = uv;
  float brightness = 0.0;
  float hueAcc = 0.0;

  // 4 iterations of affine + nonlinear transforms
  int iters = int(4.0 + complexity * 4.0);
  for (int i = 0; i < 8; i++) {
    if (i >= iters) break;
    float fi = float(i);
    float a = hash1(vec2(fi, 0.3)) * 2.0 - 1.0;
    float b = hash1(vec2(fi, 1.4)) * 2.0 - 1.0;
    float c = hash1(vec2(fi, 2.5)) * 2.0 - 1.0;
    float d = hash1(vec2(fi, 3.6)) * 2.0 - 1.0;
    float e = hash1(vec2(fi, 4.7)) * 0.5 - 0.25;
    float f = hash1(vec2(fi, 5.8)) * 0.5 - 0.25;

    vec2 tp = vec2(a * p.x + b * p.y + e, c * p.x + d * p.y + f);

    // Sinusoidal variation
    float variation = hash1(vec2(fi, 9.1));
    if (variation < 0.5) {
      tp = sin(tp * (1.0 + audio * 2.0));
    } else {
      float r = length(tp);
      tp = tp / max(r * r, 0.001) + vec2(sin(t * 0.3 + fi), cos(t * 0.2 + fi)) * 0.1;
    }

    float d2 = length(uv - tp);
    brightness += exp(-d2 * (8.0 - complexity * 4.0));
    hueAcc += hash1(vec2(fi, 7.3));
  }

  brightness = clamp(brightness * 0.15, 0.0, 1.0);
  float h = mod(hueAcc / float(iters) + t * 0.05 + audio * 0.3, 1.0);
  return hsl2rgb(h, 0.85, brightness * 0.8);
}

// ─── REACTION DIFFUSION (Gray-Scott approximation in single pass) ───
vec3 reactionDiffusion(vec2 uv, float t, float complexity, float audio) {
  // Single-pass approximation: analytical pattern that mimics RD
  float scale = 8.0 + complexity * 12.0;
  vec2 p = uv * scale;

  float feed = 0.035 + complexity * 0.02 + audio * 0.015;
  float kill = 0.060 + complexity * 0.01;

  // Turing-like pattern via layered sines
  float v = 0.0;
  for (int i = 1; i <= 5; i++) {
    float fi = float(i);
    float freq = fi * 2.0;
    float angle = hash1(vec2(fi, 0.0)) * TAU;
    v += sin(p.x * cos(angle) * freq + p.y * sin(angle) * freq + t * feed * 10.0 * fi) / fi;
  }
  v = v * 0.5 + 0.5;

  float spots = smoothstep(0.45 + kill, 0.55 + kill, v);
  vec3 colA = hsl2rgb(mod(t * 0.04 + audio * 0.3, 1.0), 0.7, 0.15);
  vec3 colB = hsl2rgb(mod(t * 0.04 + 0.5 + audio * 0.2, 1.0), 0.9, 0.7);
  return mix(colA, colB, spots);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;

  // Apply zoom
  uv /= max(uZoom, 0.1);

  // Audio distortion
  float audio = uAudioReactive ? uAudio : 0.0;
  if (uDistort > 0.001) {
    float d = uDistort * (uAudioReactive ? (0.5 + audio * 0.5) : 0.5);
    uv += vec2(
      sin(uv.y * 8.0 + uTime * 0.5) * d * 0.1,
      cos(uv.x * 7.0 + uTime * 0.4) * d * 0.1
    );
  }

  float t = uTime * uSpeed;
  float complexity = uComplexity;
  vec3 col;

  if (uPattern == 0) {
    col = voronoi(uv * 0.5 + 0.5, t, complexity, audio);
  } else if (uPattern == 1) {
    col = plasma(uv, t, complexity, audio);
  } else if (uPattern == 2) {
    col = fractalFlame(uv * 0.8, t, complexity, audio);
  } else {
    col = reactionDiffusion(uv * 0.5 + 0.5, t, complexity, audio);
  }

  // Hue rotate
  if (abs(uHue) > 0.001 || uColorCycle) {
    float h2 = uHue + (uColorCycle ? t * 0.02 : 0.0);
    // Approximate hue rotation by shifting in HSL
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.0) + vec3(sin(h2 * 6.28), sin(h2 * 6.28 + 2.09), sin(h2 * 6.28 + 4.19)) * 0.15;
    col = clamp(col, 0.0, 1.0);
  }

  gl_FragColor = vec4(col, uOpacity);
}
`

export const SHADER_ART_DESTINATIONS: Destination[] = [
  { id: 'saSpeed',      label: 'Speed',      group: 'ShaderArt', defaultSource: 'none', defaultAmount: 0, min: -1,   max: 2,   colorIndex: 8 },
  { id: 'saComplexity', label: 'Complexity', group: 'ShaderArt', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 8 },
  { id: 'saZoom',       label: 'Zoom',       group: 'ShaderArt', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0, colorIndex: 8 },
  { id: 'saHue',        label: 'Hue',        group: 'ShaderArt', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 8 },
  { id: 'saDistort',    label: 'Distort',    group: 'ShaderArt', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0, colorIndex: 8 },
]

const PARAMS: VisualizerParam[] = [
  {
    id: 'pattern', label: 'Pattern', type: 'select', default: 0, group: 'Pattern',
    options: [
      { value: 0, label: 'Voronoi' },
      { value: 1, label: 'Plasma' },
      { value: 2, label: 'Fractal Flame' },
      { value: 3, label: 'Reaction Diffusion' },
    ],
  },
  { id: 'speed',      label: 'Speed',      type: 'slider', min: 0,   max: 100, default: 30,  group: 'Einstellungen' },
  { id: 'complexity', label: 'Complexity', type: 'slider', min: 0,   max: 100, default: 40,  group: 'Einstellungen' },
  { id: 'zoom',       label: 'Zoom',       type: 'slider', min: 10,  max: 300, default: 100, group: 'Einstellungen' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'audioReactive', label: 'Audio Reactive', default: true },
  { id: 'colorCycle',    label: 'Color Cycle',    default: false },
]

export function createShaderArt(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}
  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let scene: THREE.Scene | null = null
  let camera: THREE.OrthographicCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  let material: THREE.ShaderMaterial | null = null
  let analyser: AudioAnalyser | null = null
  let elapsed = 0

  const viz: Visualizer & { __scene: THREE.Scene | null; __camera: THREE.OrthographicCamera | null } = {
    id: 'shader-art',
    name: 'Shader Art',
    category: '2d',
    description: 'Generative Shader-Muster: Voronoi, Plasma, Fractal Flame, Reaction Diffusion',
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

      material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uPattern:       { value: 0 },
          uTime:          { value: 0.0 },
          uSpeed:         { value: 0.3 },
          uComplexity:    { value: 0.4 },
          uZoom:          { value: 1.0 },
          uHue:           { value: 0.0 },
          uDistort:       { value: 0.0 },
          uAudio:         { value: 0.0 },
          uAudioReactive: { value: true },
          uColorCycle:    { value: false },
          uOpacity:       { value: 1.0 },
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
      if (!material) return
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
        if (vp['pattern'] !== undefined) paramValues['pattern'] = vp['pattern']
        if (vp['speed'] !== undefined) paramValues['speed'] = vp['speed']
        if (vp['complexity'] !== undefined) paramValues['complexity'] = vp['complexity']
        if (vp['zoom'] !== undefined) paramValues['zoom'] = vp['zoom']
      }
      if (vt) {
        if (vt['audioReactive'] !== undefined) toggleValues['audioReactive'] = vt['audioReactive']
        if (vt['colorCycle'] !== undefined) toggleValues['colorCycle'] = vt['colorCycle']
      }

      // Get audio energy
      let audioEnergy = 0
      if (analyser) {
        const analysis = analyser.getAnalysis()
        audioEnergy = analysis.energy
      }

      const hueShift = vp ? ((vp['hueShift'] ?? 0) / 360) : 0

      const u = material.uniforms
      u['uPattern']!.value       = Math.round(paramValues['pattern'] ?? 0)
      u['uTime']!.value          = elapsed
      u['uSpeed']!.value         = Math.max(0, (paramValues['speed'] ?? 30) / 100 + patchbay.get('saSpeed'))
      u['uComplexity']!.value    = Math.max(0, Math.min(1, (paramValues['complexity'] ?? 40) / 100 + patchbay.get('saComplexity')))
      u['uZoom']!.value          = Math.max(0.1, (paramValues['zoom'] ?? 100) / 100 + patchbay.get('saZoom'))
      u['uHue']!.value           = hueShift + patchbay.get('saHue')
      u['uDistort']!.value       = Math.max(0, patchbay.get('saDistort'))
      u['uAudio']!.value         = audioEnergy
      u['uAudioReactive']!.value = toggleValues['audioReactive'] ?? true
      u['uColorCycle']!.value    = toggleValues['colorCycle'] ?? false
      // 2D visualizer: don't render here — main pipeline renders __scene/__camera
    },

    resize(_w: number, _h: number) { void _w; void _h },

    dispose() {
      mesh?.geometry.dispose()
      material?.dispose()
      if (scene && mesh) scene.remove(mesh)
      mesh = null; material = null; scene = null; camera = null; renderer = null
      viz.__scene = null; viz.__camera = null
    },

    setOpacity(opacity: number) {
      if (material) material.uniforms['uOpacity']!.value = opacity
    },
  }

  return viz
}
