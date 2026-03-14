import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'

// ── Pre-allocated temporaries (zero GC in render loop) ──
const _color = new THREE.Color()
const _hsl = { h: 0, s: 0, l: 0 }

// ── Destination definitions ──
export const FRACTAL3D_DESTINATIONS: Destination[] = [
  { id: 'fPower',   label: 'Power',     group: 'Fractal', defaultSource: 'none', defaultAmount: 0, min: -2.0, max: 4.0,  colorIndex: 2 },
  { id: 'fBailout', label: 'Bailout',   group: 'Fractal', defaultSource: 'none', defaultAmount: 0, min: -1.0, max: 2.0,  colorIndex: 2 },
  { id: 'fHue',     label: 'Hue',       group: 'Color',   defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5,  colorIndex: 3 },
  { id: 'fGlow',    label: 'Glow',      group: 'Color',   defaultSource: 'none', defaultAmount: 0, min:  0.0, max: 1.0,  colorIndex: 3 },
  { id: 'fSlice',   label: 'Slice',     group: 'Fractal', defaultSource: 'none', defaultAmount: 0, min: -1.0, max: 1.0,  colorIndex: 2 },
]

const PARAMS: VisualizerParam[] = [
  { id: 'iterations', label: 'Iterations', type: 'slider', min: 4,  max: 20,  default: 8,  group: 'Fractal' },
  { id: 'power',      label: 'Power',      type: 'slider', min: 2,  max: 12,  default: 8,  group: 'Fractal' },
  { id: 'bailout',    label: 'Bailout',    type: 'slider', min: 1,  max: 100, default: 40, group: 'Fractal' },
  { id: 'epsilon',    label: 'Epsilon',    type: 'slider', min: 1,  max: 100, default: 5,  group: 'Fractal' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'animate',          label: 'Animate',           default: true  },
  { id: 'colorByIteration', label: 'Color by Iteration', default: true  },
  { id: 'orbitTrap',        label: 'Orbit Trap',         default: false },
]

// Raymarching fragment shader with Mandelbulb distance estimator
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;

  uniform float time;
  uniform float power;
  uniform float bailout;
  uniform float epsilon;
  uniform int   iterations;
  uniform float hue;
  uniform float glow;
  uniform float slice;
  uniform bool  colorByIteration;
  uniform bool  orbitTrap;
  uniform float opacity;

  varying vec2 vUv;

  // Mandelbulb distance estimator
  vec2 mandelbulb(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r  = 0.0;
    float trap = 1e10;
    for (int i = 0; i < 20; i++) {
      if (i >= iterations) break;
      r = length(z);
      if (r > bailout) break;

      // Convert to polar
      float theta = acos(z.z / r);
      float phi   = atan(z.y, z.x);
      dr = pow(r, power - 1.0) * power * dr + 1.0;

      // Scale and rotate
      float zr = pow(r, power);
      theta *= power;
      phi   *= power;

      // Convert back to Cartesian + add c
      z = zr * vec3(
        sin(theta) * cos(phi),
        sin(theta) * sin(phi),
        cos(theta)
      ) + pos;

      trap = min(trap, length(z));
    }
    return vec2(0.5 * log(r) * r / dr, trap);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= 1.5; // aspect correction approximation

    // Camera
    vec3 ro = vec3(sin(time * 0.15) * 2.5, cos(time * 0.1) * 1.5, 3.5 + slice);
    vec3 ta = vec3(0.0);
    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = cross(uu, ww);
    vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.5 * ww);

    // Raymarch
    float t = 0.0;
    float eps = epsilon * 0.00001;
    vec3 col = vec3(0.0);
    float hit = 0.0;
    float trapVal = 0.0;

    for (int i = 0; i < 128; i++) {
      vec3 p = ro + rd * t;
      vec2 res = mandelbulb(p);
      float d = res.x;
      trapVal = res.y;
      if (d < eps) {
        hit = 1.0 - float(i) / 128.0;
        break;
      }
      t += max(d * 0.5, eps);
      if (t > 8.0) break;
    }

    if (hit > 0.0) {
      float h = hue + (colorByIteration ? hit * 0.7 : 0.3);
      if (orbitTrap) h = hue + trapVal * 0.5;
      col = hsv2rgb(vec3(fract(h), 0.8, hit + glow * 0.5));
    } else {
      // Background glow
      col = vec3(0.0) + glow * 0.05;
    }

    gl_FragColor = vec4(col, opacity);
  }
`

export function createFractal3D(): Visualizer {
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}

  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  let scene: THREE.Scene | null = null
  let elapsed = 0

  return {
    id: 'fractal-3d',
    name: 'Mandelbulb',
    category: '3d',
    description: 'Mandelbulb Raymarching auf Fullscreen-Quad',
    params: PARAMS,
    toggles: TOGGLES,

    init(context: VisualizerContext) {
      scene = context.scene

      const geo = new THREE.PlaneGeometry(2, 2)

      _color.setHSL(0.6, 1.0, 0.5)
      _color.getHSL(_hsl)

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          time:             { value: 0 },
          power:            { value: (paramValues['power'] ?? 8) },
          bailout:          { value: (paramValues['bailout'] ?? 40) / 10 },
          epsilon:          { value: (paramValues['epsilon'] ?? 5) },
          iterations:       { value: Math.round(paramValues['iterations'] ?? 8) },
          hue:              { value: _hsl.h },
          glow:             { value: 0.0 },
          slice:            { value: 0.0 },
          colorByIteration: { value: toggleValues['colorByIteration'] ?? true },
          orbitTrap:        { value: toggleValues['orbitTrap'] ?? false },
          opacity:          { value: 1.0 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })

      mesh = new THREE.Mesh(geo, mat)
      mesh.renderOrder = -1
      scene.add(mesh)
    },

    update(dt: number, patchbay: Patchbay) {
      if (!mesh) return
      if (toggleValues['animate']) elapsed += dt

      const uniforms = mesh.material.uniforms

      uniforms['time']!.value       = elapsed
      uniforms['power']!.value      = Math.max(2, Math.min(16, (paramValues['power'] ?? 8) + patchbay.get('fPower') * 4))
      uniforms['bailout']!.value    = Math.max(1, (paramValues['bailout'] ?? 40) / 10 + patchbay.get('fBailout'))
      uniforms['iterations']!.value = Math.round(paramValues['iterations'] ?? 8)
      uniforms['epsilon']!.value    = paramValues['epsilon'] ?? 5

      // Color
      _color.setHSL(0.6, 1.0, 0.5)
      _color.getHSL(_hsl)
      let h = _hsl.h + patchbay.get('fHue')
      if (h > 1) h -= Math.floor(h)
      if (h < 0) h += Math.ceil(-h)
      uniforms['hue']!.value = h

      uniforms['glow']!.value  = Math.max(0, patchbay.get('fGlow'))
      uniforms['slice']!.value = patchbay.get('fSlice')

      uniforms['colorByIteration']!.value = toggleValues['colorByIteration'] ?? true
      uniforms['orbitTrap']!.value        = toggleValues['orbitTrap'] ?? false
    },

    resize(_width: number, _height: number) { /* fullscreen quad, no resize needed */ },

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
