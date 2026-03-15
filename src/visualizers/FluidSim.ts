/**
 * FluidSim — 2D Navier-Stokes fluid simulation using GPGPU ping-pong render targets.
 *
 * Passes per frame:
 *  1. Advect velocity
 *  2. Apply force (audio-driven splat at center)
 *  3. Diffuse velocity (1 Jacobi iteration for viscosity)
 *  4. Compute divergence
 *  5. Pressure solve (N Jacobi iterations)
 *  6. Subtract pressure gradient (make velocity divergence-free)
 *  7. Advect density/color
 *  8. Display
 */
import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'
import type { AudioAnalyser } from '@input/AudioAnalyser'

// ── Shared fullscreen vert ──
const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`

// ── Advection (semi-Lagrangian) ──
const ADVECT_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;

void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vec2 prev = vUv - vel * uDt * uTexelSize;
  prev = clamp(prev, uTexelSize, 1.0 - uTexelSize);
  vec4 result = uDissipation * texture2D(uSource, prev);
  gl_FragColor = result;
}
`

// ── Force splat ──
const SPLAT_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uBase;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius;
uniform float uForce;

void main() {
  vec2 d = vUv - uPoint;
  float falloff = exp(-dot(d, d) / max(uRadius * uRadius, 0.0001));
  vec4 base = texture2D(uBase, vUv);
  gl_FragColor = base + vec4(uColor * uForce * falloff, 0.0);
}
`

// ── Divergence ──
const DIVERGENCE_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

void main() {
  vec2 L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).xy;
  vec2 R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).xy;
  vec2 B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).xy;
  vec2 T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).xy;
  float div = 0.5 * ((R.x - L.x) + (T.y - B.y));
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

// ── Jacobi pressure solve ──
const PRESSURE_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;

void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).r;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).r;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).r;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).r;
  float div = texture2D(uDivergence, vUv).r;
  float pressure = (L + R + B + T - div) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`

// ── Gradient subtract ──
const GRADIENT_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).r;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).r;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).r;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).r;
  vec2 grad = vec2(R - L, T - B) * 0.5;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  gl_FragColor = vec4(vel - grad, 0.0, 1.0);
}
`

// ── Display ──
const DISPLAY_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uDensity;
uniform float uHue;
uniform bool  uRainbow;
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
  return rgb + (l - c * 0.5);
}

void main() {
  vec3 density = texture2D(uDensity, vUv).rgb;
  vec3 col;
  if (uRainbow) {
    float lum = dot(density, vec3(0.333));
    col = hsl2rgb(mod(lum * 2.0 + uHue, 1.0), 0.9, clamp(lum, 0.0, 0.8));
  } else {
    col = hsl2rgb(mod(uHue, 1.0), 0.85, 0.1) + density;
    col = clamp(col, 0.0, 1.0);
  }
  gl_FragColor = vec4(col, uOpacity);
}
`

// ── Helpers ──
function makeRT(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    depthBuffer: false,
  })
}

function makePass(frag: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: frag,
    depthWrite: false,
    uniforms,
  })
}

// ── Destinations ──
export const FLUID_SIM_DESTINATIONS: Destination[] = [
  { id: 'flViscosity', label: 'Viscosity', group: 'FluidSim', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 11 },
  { id: 'flForce',     label: 'Force',     group: 'FluidSim', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0, colorIndex: 11 },
  { id: 'flHue',       label: 'Hue',       group: 'FluidSim', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 11 },
  { id: 'flDecay',     label: 'Decay',     group: 'FluidSim', defaultSource: 'none', defaultAmount: 0, min: -0.3, max: 0.3, colorIndex: 11 },
  { id: 'flSpeed',     label: 'Speed',     group: 'FluidSim', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.0, colorIndex: 11 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'viscosity',    label: 'Viscosity',    type: 'slider', min: 0,   max: 100, default: 30, group: 'Simulation' },
  { id: 'diffusion',    label: 'Diffusion',    type: 'slider', min: 0,   max: 100, default: 40, group: 'Simulation' },
  { id: 'forceRadius',  label: 'Force Radius', type: 'slider', min: 1,   max: 50,  default: 8,  group: 'Simulation' },
  { id: 'colorDecay',   label: 'Color Decay',  type: 'slider', min: 0,   max: 100, default: 20, group: 'Simulation' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'audioInject', label: 'Audio Inject', default: true },
  { id: 'mouseInject', label: 'Mouse Inject', default: false },
  { id: 'rainbow',     label: 'Rainbow',      default: false },
]

export function createFluidSim(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}
  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  const SIM_W = 256
  const SIM_H = 256
  const PRESSURE_ITERS = 20

  let renderer: THREE.WebGLRenderer | null = null

  // Ping-pong RTs
  let velA: THREE.WebGLRenderTarget | null = null
  let velB: THREE.WebGLRenderTarget | null = null
  let denA: THREE.WebGLRenderTarget | null = null
  let denB: THREE.WebGLRenderTarget | null = null
  let pressA: THREE.WebGLRenderTarget | null = null
  let pressB: THREE.WebGLRenderTarget | null = null
  let divRT: THREE.WebGLRenderTarget | null = null

  // Materials
  let matAdvect: THREE.ShaderMaterial | null = null
  let matSplat: THREE.ShaderMaterial | null = null
  let matDivergence: THREE.ShaderMaterial | null = null
  let matPressure: THREE.ShaderMaterial | null = null
  let matGradient: THREE.ShaderMaterial | null = null
  let matDisplay: THREE.ShaderMaterial | null = null

  // Fullscreen scene — fsMesh material is swapped each pass
  let fsScene: THREE.Scene | null = null
  let fsCamera: THREE.OrthographicCamera | null = null
  // Use THREE.Material base so we can swap ShaderMaterial / MeshBasicMaterial freely
  let fsMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.Material> | null = null

  // Display scene
  let displayScene: THREE.Scene | null = null
  let displayMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null

  let analyser: AudioAnalyser | null = null
  let elapsed = 0
  let opacity = 1

  const texelSize = new THREE.Vector2(1 / SIM_W, 1 / SIM_H)

  // Render a pass: set material on fsMesh, render to target
  function runPass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    if (!renderer || !fsScene || !fsCamera || !fsMesh) return
    // Material type is compatible at runtime; ShaderMaterial extends Material
    fsMesh.material = mat as THREE.Material
    renderer.setRenderTarget(target)
    renderer.render(fsScene, fsCamera)
    renderer.setRenderTarget(null)
  }

  function swap<T>(a: T, b: T): [T, T] { return [b, a] }

  return {
    id: 'fluid-sim',
    name: 'Fluid Simulation',
    category: '2d',
    description: '2D Navier-Stokes Fluidsimulation mit Audio-getriebenen Kräften',
    params: PARAMS,
    toggles: TOGGLES,

    init(ctx: VisualizerContext) {
      renderer = ctx.renderer

      // Fullscreen pass setup
      fsScene = new THREE.Scene()
      fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      const geo = new THREE.PlaneGeometry(2, 2)
      // Placeholder material, will be swapped per pass
      fsMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
      fsScene.add(fsMesh)

      // RTs
      velA = makeRT(SIM_W, SIM_H)
      velB = makeRT(SIM_W, SIM_H)
      denA = makeRT(SIM_W, SIM_H)
      denB = makeRT(SIM_W, SIM_H)
      pressA = makeRT(SIM_W, SIM_H)
      pressB = makeRT(SIM_W, SIM_H)
      divRT  = makeRT(SIM_W, SIM_H)

      // Materials
      matAdvect = makePass(ADVECT_FRAG, {
        uVelocity:    { value: null },
        uSource:      { value: null },
        uTexelSize:   { value: texelSize },
        uDt:          { value: 0.016 },
        uDissipation: { value: 0.999 },
      })

      matSplat = makePass(SPLAT_FRAG, {
        uBase:   { value: null },
        uPoint:  { value: new THREE.Vector2(0.5, 0.5) },
        uColor:  { value: new THREE.Vector3(1, 0.5, 0.2) },
        uRadius: { value: 0.08 },
        uForce:  { value: 1.0 },
      })

      matDivergence = makePass(DIVERGENCE_FRAG, {
        uVelocity:  { value: null },
        uTexelSize: { value: texelSize },
      })

      matPressure = makePass(PRESSURE_FRAG, {
        uPressure:   { value: null },
        uDivergence: { value: null },
        uTexelSize:  { value: texelSize },
      })

      matGradient = makePass(GRADIENT_FRAG, {
        uPressure:  { value: null },
        uVelocity:  { value: null },
        uTexelSize: { value: texelSize },
      })

      matDisplay = makePass(DISPLAY_FRAG, {
        uDensity: { value: null },
        uHue:     { value: 0.0 },
        uRainbow: { value: false },
        uOpacity: { value: 1.0 },
      })

      // Display scene (renders to screen)
      displayScene = new THREE.Scene()
      const displayCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matDisplay)
      displayScene.add(displayMesh)
      // Store displayCam on displayScene for later use
      displayScene.userData['camera'] = displayCam

      if (typeof window !== 'undefined') {
        const w = window as unknown as { __synoptikAnalyser?: AudioAnalyser }
        analyser = w.__synoptikAnalyser ?? null
      }
    },

    update(dt: number, patchbay: Patchbay) {
      if (!renderer || !fsScene || !fsCamera || !fsMesh) return
      if (!velA || !velB || !denA || !denB || !pressA || !pressB || !divRT) return
      if (!matAdvect || !matSplat || !matDivergence || !matPressure || !matGradient || !matDisplay) return
      elapsed += dt

      // Re-check analyser each frame (may become available later)
      if (!analyser && typeof window !== 'undefined') {
        const w = window as unknown as { __synoptikAnalyser?: AudioAnalyser }
        analyser = w.__synoptikAnalyser ?? null
      }

      const effectiveDt = Math.min(dt, 0.033) * Math.max(0.1, 1.0 + patchbay.get('flSpeed'))
      const viscosity = Math.max(0, (paramValues['viscosity'] ?? 30) / 100 + patchbay.get('flViscosity'))
      const colorDecay = Math.max(0.9, 1.0 - ((paramValues['colorDecay'] ?? 20) / 100 + patchbay.get('flDecay')) * 0.1)
      const forceRadius = (paramValues['forceRadius'] ?? 8) / 100
      const hue = patchbay.get('flHue')

      // Get audio energy
      let audioEnergy = 0
      if (analyser) {
        const analysis = analyser.getAnalysis()
        audioEnergy = analysis.energy
      }

      // 1. Advect velocity
      matAdvect.uniforms['uVelocity']!.value    = velA.texture
      matAdvect.uniforms['uSource']!.value      = velA.texture
      matAdvect.uniforms['uDt']!.value          = effectiveDt
      matAdvect.uniforms['uDissipation']!.value = Math.max(0.9, 1.0 - viscosity * 0.05)
      runPass(matAdvect, velB)
      ;[velA, velB] = swap(velA, velB)

      // 2. Splat force — audio-driven or auto-forces when no audio
      const hasAudio = analyser && audioEnergy > 0.01
      const shouldInject = (toggleValues['audioInject'] && hasAudio) || !hasAudio

      if (shouldInject) {
        // Use audio energy or synthetic pulsing force
        const baseForce = hasAudio ? audioEnergy * 2.0 : (0.3 + 0.2 * Math.sin(elapsed * 1.5))
        const force = Math.max(0, (baseForce + patchbay.get('flForce')) * 3.0)
        const h = hue + elapsed * 0.1
        const r = Math.sin(h * Math.PI * 2) * 0.5 + 0.5
        const g = Math.sin(h * Math.PI * 2 + 2.094) * 0.5 + 0.5
        const b = Math.sin(h * Math.PI * 2 + 4.189) * 0.5 + 0.5

        // Velocity splat — orbit around center
        const splatX = 0.5 + Math.sin(elapsed * 0.7) * 0.2
        const splatY = 0.5 + Math.cos(elapsed * 0.5) * 0.2

        ;(matSplat.uniforms['uBase']!.value as THREE.Texture | null) = velA.texture
        ;(matSplat.uniforms['uPoint']!.value as THREE.Vector2).set(splatX, splatY)
        ;(matSplat.uniforms['uColor']!.value as THREE.Vector3).set(
          Math.cos(elapsed * 1.3) * force,
          Math.sin(elapsed * 0.9) * force,
          0,
        )
        matSplat.uniforms['uRadius']!.value = forceRadius
        matSplat.uniforms['uForce']!.value  = 1.0
        runPass(matSplat, velB)
        ;[velA, velB] = swap(velA, velB)

        // Density splat
        ;(matSplat.uniforms['uBase']!.value as THREE.Texture | null) = denA.texture
        ;(matSplat.uniforms['uColor']!.value as THREE.Vector3).set(r, g, b)
        matSplat.uniforms['uForce']!.value  = force * 0.5
        runPass(matSplat, denB)
        ;[denA, denB] = swap(denA, denB)
      }

      // 3. Divergence
      matDivergence.uniforms['uVelocity']!.value = velA.texture
      runPass(matDivergence, divRT)

      // 4. Pressure solve (Jacobi iterations)
      // Clear pressure
      renderer.setRenderTarget(pressA)
      renderer.clearColor()
      renderer.setRenderTarget(null)

      for (let i = 0; i < PRESSURE_ITERS; i++) {
        matPressure.uniforms['uPressure']!.value   = pressA.texture
        matPressure.uniforms['uDivergence']!.value = divRT.texture
        runPass(matPressure, pressB)
        ;[pressA, pressB] = swap(pressA, pressB)
      }

      // 5. Subtract pressure gradient
      matGradient.uniforms['uPressure']!.value = pressA.texture
      matGradient.uniforms['uVelocity']!.value = velA.texture
      runPass(matGradient, velB)
      ;[velA, velB] = swap(velA, velB)

      // 6. Advect density
      matAdvect.uniforms['uVelocity']!.value    = velA.texture
      matAdvect.uniforms['uSource']!.value      = denA.texture
      matAdvect.uniforms['uDt']!.value          = effectiveDt
      matAdvect.uniforms['uDissipation']!.value = colorDecay
      runPass(matAdvect, denB)
      ;[denA, denB] = swap(denA, denB)

      // 7. Display
      matDisplay.uniforms['uDensity']!.value = denA.texture
      matDisplay.uniforms['uHue']!.value     = hue
      matDisplay.uniforms['uRainbow']!.value = toggleValues['rainbow'] ?? false
      matDisplay.uniforms['uOpacity']!.value = opacity

      if (displayScene && displayMesh) {
        displayMesh.material = matDisplay
        const displayCam = displayScene.userData['camera'] as THREE.OrthographicCamera
        renderer.setRenderTarget(null)
        renderer.render(displayScene, displayCam)
      }
    },

    resize(_w: number, _h: number) { void _w; void _h },

    dispose() {
      velA?.dispose(); velB?.dispose()
      denA?.dispose(); denB?.dispose()
      pressA?.dispose(); pressB?.dispose()
      divRT?.dispose()
      matAdvect?.dispose(); matSplat?.dispose()
      matDivergence?.dispose(); matPressure?.dispose()
      matGradient?.dispose(); matDisplay?.dispose()
      fsMesh?.geometry.dispose()
      ;(fsMesh?.material as THREE.Material | undefined)?.dispose()
      displayMesh?.geometry.dispose()

      velA = null; velB = null; denA = null; denB = null
      pressA = null; pressB = null; divRT = null
      matAdvect = null; matSplat = null; matDivergence = null
      matPressure = null; matGradient = null; matDisplay = null
      fsMesh = null; displayMesh = null
      fsScene = null; fsCamera = null; displayScene = null
      renderer = null
    },

    setOpacity(op: number) {
      opacity = op
      if (matDisplay) matDisplay.uniforms['uOpacity']!.value = op
    },
  }
}
