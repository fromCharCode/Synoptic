import * as THREE from 'three'
import type {
  Visualizer, VisualizerContext, VisualizerParam, VisualizerToggle,
  Patchbay, Destination,
} from '@core/types'
import { evaluateSurface } from './surfaces'
import {
  createMainMaterial, createWireMaterial, createInnerMaterial,
  createParticleMaterial, STYLES,
} from '@scene/MaterialFactory'
import { createFresnelMaterial } from '@scene/FresnelMaterial'
import type { FresnelUniforms } from '@scene/FresnelMaterial'

// ── Pre-allocated temporaries (zero GC in render loop) ──
const _v = new THREE.Vector3()
const _color = new THREE.Color()
const _hsl = { h: 0, s: 0, l: 0 }
const _emHsl = { h: 0, s: 0, l: 0 }
const _fHsl = { h: 0, s: 0, l: 0 }

// ── Geometry Builder ──
function createSurfaceGeometry(segU: number, segV: number, topology: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let j = 0; j <= segV; j++) {
    for (let i = 0; i <= segU; i++) {
      const u = (i / segU) * Math.PI * 2
      const v = (j / segV) * Math.PI * 2
      const p = evaluateSurface(u, v, topology)
      positions.push(p.x, p.y, p.z)
      uvs.push(i / segU, j / segV)

      // Compute normal via finite differences
      const du = 0.002
      const dv = 0.002
      const pu = evaluateSurface(u + du, v, topology)
      const pv = evaluateSurface(u, v + dv, topology)
      const tx = pu.x - p.x, ty = pu.y - p.y, tz = pu.z - p.z
      const bx = pv.x - p.x, by = pv.y - p.y, bz = pv.z - p.z
      let nx = ty * bz - tz * by
      let ny = tz * bx - tx * bz
      let nz = tx * by - ty * bx
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
      normals.push(nx / len, ny / len, nz / len)
    }
  }

  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i
      const b = a + 1
      const c = a + (segU + 1)
      const d = c + 1
      indices.push(a, b, d, a, d, c)
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

// ── Destination definitions ──
const DESTINATIONS: Destination[] = [
  // Transform
  { id: 'scale', label: 'Scale', group: 'Transform', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 1 },
  { id: 'rotX', label: 'Rot X', group: 'Transform', defaultSource: 'none', defaultAmount: 0, min: -2, max: 2, colorIndex: 1 },
  { id: 'rotY', label: 'Rot Y', group: 'Transform', defaultSource: 'none', defaultAmount: 0, min: -2, max: 2, colorIndex: 1 },
  { id: 'rotZ', label: 'Rot Z', group: 'Transform', defaultSource: 'none', defaultAmount: 0, min: -2, max: 2, colorIndex: 1 },
  // Geometry
  { id: 'dB', label: 'Displace Bass', group: 'Geometry', defaultSource: 'bass', defaultAmount: 0, min: 0, max: 0.5, colorIndex: 2 },
  { id: 'dM', label: 'Displace Mid', group: 'Geometry', defaultSource: 'mid', defaultAmount: 0, min: 0, max: 0.3, colorIndex: 2 },
  { id: 'dH', label: 'Displace High', group: 'Geometry', defaultSource: 'high', defaultAmount: 0, min: 0, max: 0.15, colorIndex: 2 },
  { id: 'sU', label: 'Seg U Mod', group: 'Geometry', defaultSource: 'none', defaultAmount: 0, min: -40, max: 40, colorIndex: 2 },
  { id: 'sV', label: 'Seg V Mod', group: 'Geometry', defaultSource: 'none', defaultAmount: 0, min: -20, max: 20, colorIndex: 2 },
  { id: 'topo', label: 'Topology Mod', group: 'Geometry', defaultSource: 'none', defaultAmount: 0, min: -200, max: 200, colorIndex: 2 },
  { id: 'morphSpeed', label: 'Morph Speed', group: 'Geometry', defaultSource: 'none', defaultAmount: 0, min: -2, max: 2, colorIndex: 2 },
  // Per-band displacement (extending dB, dM, dH)
  { id: 'dSub', label: 'Disp Sub', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 0.5, colorIndex: 2 },
  { id: 'dHM', label: 'Disp HiMid', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 0.2, colorIndex: 2 },
  { id: 'dPres', label: 'Disp Pres', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 0.1, colorIndex: 2 },
  { id: 'dAir', label: 'Disp Air', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 0.08, colorIndex: 2 },
  // Displacement wave control
  { id: 'dispFreq', label: 'Disp Freq', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 10, colorIndex: 2 },
  { id: 'dispSpeed', label: 'Disp Speed', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: -5, max: 5, colorIndex: 2 },
  { id: 'dispAmp', label: 'Disp Amp', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 2, colorIndex: 2 },
  // Vertex noise
  { id: 'noiseAmt', label: 'Noise', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 0.5, colorIndex: 2 },
  { id: 'noiseFreq', label: 'Noise Freq', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 20, colorIndex: 2 },
  { id: 'noiseSpeed', label: 'Noise Speed', group: 'Geometry', defaultSource: 'none', defaultAmount: 50, min: 0, max: 3, colorIndex: 2 },
  // Color
  { id: 'hue', label: 'Hue', group: 'Color', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 3 },
  { id: 'sat', label: 'Saturation', group: 'Color', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 3 },
  { id: 'brt', label: 'Brightness', group: 'Color', defaultSource: 'none', defaultAmount: 0, min: -0.3, max: 0.3, colorIndex: 3 },
  { id: 'eHue', label: 'Emissive Hue', group: 'Color', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 3 },
  { id: 'eI', label: 'Emissive Int', group: 'Color', defaultSource: 'none', defaultAmount: 0, min: -1, max: 2, colorIndex: 3 },
  { id: 'fStr', label: 'Fresnel Str', group: 'Color', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1.5, colorIndex: 4 },
  { id: 'fHue', label: 'Fresnel Hue', group: 'Color', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 4 },
  { id: 'bgHue', label: 'BG Hue', group: 'Color', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 3 },
  // Material
  { id: 'met', label: 'Metalness', group: 'Material', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 5 },
  { id: 'rou', label: 'Roughness', group: 'Material', defaultSource: 'none', defaultAmount: 0, min: -0.3, max: 0.5, colorIndex: 5 },
  { id: 'opa', label: 'Opacity', group: 'Material', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 5 },
  { id: 'wireOpa', label: 'Wire Opacity', group: 'Material', defaultSource: 'none', defaultAmount: 0, min: -0.3, max: 0.5, colorIndex: 5 },
]

// ── Params + Toggles ──
const PARAMS: VisualizerParam[] = [
  { id: 'topology', label: 'Topologie', type: 'slider', min: 0, max: 800, default: 0, group: 'Topologie' },
  { id: 'segU', label: 'Seg U', type: 'slider', min: 20, max: 180, default: 90, group: 'Geometrie' },
  { id: 'segV', label: 'Seg V', type: 'slider', min: 12, max: 90, default: 45, group: 'Geometrie' },
  { id: 'scale', label: 'Scale', type: 'slider', min: 20, max: 150, default: 70, group: 'Geometrie' },
  { id: 'rotation', label: 'Rotation', type: 'slider', min: 0, max: 100, default: 25, group: 'Geometrie' },
]

const TOGGLES: VisualizerToggle[] = [
  { id: 'wireframe', label: 'Wireframe', default: false },
  { id: 'autoRotation', label: 'Auto-Rotation', default: true },
  { id: 'pulsation', label: 'Pulsation', default: true },
  { id: 'particles', label: 'Partikel', default: false },
  { id: 'clipPlane', label: 'Clip Plane', default: false },
  { id: 'innerSide', label: 'Inner Side', default: false },
  { id: 'fresnelGlow', label: 'Fresnel Glow', default: true },
  { id: 'spectrumRing', label: 'Spectrum Ring', default: true },
]

export interface ParametricSurfaceVisualizer extends Visualizer {
  readonly destinations: Destination[]
  readonly paramValues: Record<string, number>
  readonly toggleValues: Record<string, boolean>
  setParam(id: string, value: number): void
  setToggle(id: string, value: boolean): void
  setStyle(styleId: string): void
  registerDestinations(patchbay: Patchbay): void
}

export function createParametricSurface(): ParametricSurfaceVisualizer {
  // State
  const paramValues: Record<string, number> = {}
  const toggleValues: Record<string, boolean> = {}

  // Initialize defaults
  for (const p of PARAMS) paramValues[p.id] = p.default
  for (const t of TOGGLES) toggleValues[t.id] = t.default

  // Meshes
  let mainMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null
  let wireMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null
  let innerMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null
  let fresnelMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
  let particlePoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null
  let fresnelUniforms: FresnelUniforms | null = null

  // Scene refs
  let group: THREE.Group | null = null
  let clippingPlane: THREE.Plane | null = null
  let cubeRenderTarget: THREE.WebGLCubeRenderTarget | null = null

  // Base HSL values (from current style)
  let baseHSL = { h: 0, s: 0, l: 0 }
  let baseEmissiveHSL = { h: 0, s: 0, l: 0 }
  let currentStyleId = 'glass'

  // Rebuild tracking
  let lastSegU = 0
  let lastSegV = 0
  let lastTopology = 0
  let elapsed = 0

  function getStyle() {
    return STYLES[currentStyleId] ?? STYLES['glass']!
  }

  function applyStyle() {
    const style = getStyle()
    if (!mainMesh) return

    const mat = mainMesh.material
    mat.color.set(style.color)
    mat.emissive.set(style.emissive)
    mat.emissiveIntensity = style.emissiveIntensity
    mat.metalness = style.metalness
    mat.roughness = style.roughness
    mat.opacity = style.opacity
    mat.transparent = style.transparent
    mat.wireframe = style.forceWireframe ?? false

    if (cubeRenderTarget) {
      mat.envMap = cubeRenderTarget.texture
      mat.envMapIntensity = style.envMapIntensity
    }

    _color.set(style.color).getHSL(_hsl)
    baseHSL = { h: _hsl.h, s: _hsl.s, l: _hsl.l }
    _color.set(style.emissive).getHSL(_hsl)
    baseEmissiveHSL = { h: _hsl.h, s: _hsl.s, l: _hsl.l }

    if (wireMesh) {
      wireMesh.material.color.set(style.wireColor)
    }
    if (innerMesh) {
      const c = new THREE.Color(style.wireColor).offsetHSL(0.5, 0, 0)
      innerMesh.material.color.copy(c)
      innerMesh.material.emissive.copy(c)
    }
    if (particlePoints) {
      particlePoints.material.color.set(style.wireColor)
    }
  }

  function rebuildGeometry(segU: number, segV: number, topology: number) {
    const geo = createSurfaceGeometry(segU, segV, topology)

    if (mainMesh) {
      mainMesh.geometry.dispose()
      mainMesh.geometry = geo
    }
    if (wireMesh && wireMesh.visible) {
      wireMesh.geometry.dispose()
      wireMesh.geometry = geo.clone()
    }
    if (innerMesh && innerMesh.visible) {
      innerMesh.geometry.dispose()
      innerMesh.geometry = geo.clone()
    }
    if (fresnelMesh) {
      fresnelMesh.geometry.dispose()
      fresnelMesh.geometry = geo.clone()
    }
    if (particlePoints && particlePoints.visible) {
      particlePoints.geometry.dispose()
      particlePoints.geometry = geo.clone()
    }

    lastSegU = segU
    lastSegV = segV
    lastTopology = topology
  }

  const viz: Visualizer = {
    id: 'parametricSurface',
    name: 'Parametrische Fläche',
    category: 'surface',
    description: '9 parametrische Topologien mit Smoothstep-Morphing',
    params: PARAMS,
    toggles: TOGGLES,

    init(context: VisualizerContext) {
      // Find kGroup and clippingPlane from scene children
      // The SceneManager adds kGroup to the scene
      for (const child of context.scene.children) {
        if (child instanceof THREE.Group) {
          group = child
          break
        }
      }
      if (!group) {
        group = new THREE.Group()
        context.scene.add(group)
      }

      // Find cube render target (check scene for CubeCamera)
      for (const child of context.scene.children) {
        if (child instanceof THREE.CubeCamera) {
          cubeRenderTarget = (child as THREE.CubeCamera & { renderTarget: THREE.WebGLCubeRenderTarget }).renderTarget
          break
        }
      }

      clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

      const style = getStyle()
      const segU = paramValues['segU'] ?? 90
      const segV = paramValues['segV'] ?? 45
      const topology = paramValues['topology'] ?? 0
      const geo = createSurfaceGeometry(segU, segV, topology)

      lastSegU = segU
      lastSegV = segV
      lastTopology = topology

      // Main mesh
      const envMap = cubeRenderTarget ? cubeRenderTarget.texture : undefined
      const mainMat = createMainMaterial(style, envMap, [clippingPlane])
      mainMesh = new THREE.Mesh(geo, mainMat)
      group.add(mainMesh)

      // Get base HSL
      _color.set(style.color).getHSL(_hsl)
      baseHSL = { h: _hsl.h, s: _hsl.s, l: _hsl.l }
      _color.set(style.emissive).getHSL(_hsl)
      baseEmissiveHSL = { h: _hsl.h, s: _hsl.s, l: _hsl.l }

      // Wire mesh
      const wireMat = createWireMaterial(style)
      wireMesh = new THREE.Mesh(geo.clone(), wireMat)
      wireMesh.visible = toggleValues['wireframe'] ?? true
      group.add(wireMesh)

      // Inner mesh
      const innerMat = createInnerMaterial(style, [clippingPlane])
      innerMesh = new THREE.Mesh(geo.clone(), innerMat)
      innerMesh.visible = toggleValues['innerSide'] ?? false
      group.add(innerMesh)

      // Fresnel mesh
      const { material: fresnelMat, uniforms: fUniforms } = createFresnelMaterial()
      fresnelUniforms = fUniforms
      fresnelMesh = new THREE.Mesh(geo.clone(), fresnelMat)
      fresnelMesh.visible = toggleValues['fresnelGlow'] ?? true
      group.add(fresnelMesh)

      // Particles
      const particleMat = createParticleMaterial(style)
      particlePoints = new THREE.Points(geo.clone(), particleMat)
      particlePoints.visible = toggleValues['particles'] ?? false
      group.add(particlePoints)

      // Set initial scale
      const sc = (paramValues['scale'] ?? 70) / 100
      group.scale.setScalar(sc)
    },

    update(dt: number, patchbay: Patchbay) {
      if (!mainMesh || !group) return
      elapsed += dt

      const frameCount = Math.round(elapsed / (1 / 60))

      // ── Scale + Pulsation ──
      let sc = (paramValues['scale'] ?? 70) / 100 + patchbay.get('scale')
      if (toggleValues['pulsation']) {
        sc *= 1 + Math.sin(elapsed * 1.5) * 0.02
      }
      group.scale.setScalar(Math.max(0.05, sc))

      // ── Rotation ──
      const rotSpeed = (paramValues['rotation'] ?? 25) / 100
      if (toggleValues['autoRotation']) {
        _v.y = group.rotation.y + rotSpeed * dt
      } else {
        _v.y = group.rotation.y
      }
      _v.y += patchbay.get('rotY') * dt
      _v.x = group.rotation.x + patchbay.get('rotX') * dt
      group.rotation.y += (_v.y - group.rotation.y) * 0.08
      group.rotation.x += (_v.x - group.rotation.x) * 0.08
      group.rotation.z += patchbay.get('rotZ') * dt

      // ── Throttled geometry rebuild (every 4th frame) ──
      const baseSegU = paramValues['segU'] ?? 90
      const baseSegV = paramValues['segV'] ?? 45
      const effectiveSegU = Math.max(8, Math.min(200, Math.round(baseSegU + patchbay.get('sU'))))
      const effectiveSegV = Math.max(6, Math.min(100, Math.round(baseSegV + patchbay.get('sV'))))
      const baseTopo = paramValues['topology'] ?? 0
      const effectiveTopo = Math.max(0, Math.min(800, baseTopo + patchbay.get('topo')))

      const segChanged = effectiveSegU !== lastSegU || effectiveSegV !== lastSegV
      const topoChanged = Math.abs(effectiveTopo - lastTopology) > 0.3

      if ((segChanged || topoChanged) && frameCount % 4 === 0) {
        rebuildGeometry(effectiveSegU, effectiveSegV, effectiveTopo)
      }

      // ── Vertex displacement (every frame) ──
      const dB = patchbay.get('dB')
      const dM = patchbay.get('dM')
      const dH = patchbay.get('dH')
      const dSub = patchbay.get('dSub')
      const dHM = patchbay.get('dHM')
      const dPres = patchbay.get('dPres')
      const dAir = patchbay.get('dAir')
      const dispFreq = patchbay.get('dispFreq')
      const dispSpeed = patchbay.get('dispSpeed')
      const dispAmp = patchbay.get('dispAmp')
      const noiseAmt = patchbay.get('noiseAmt')
      const noiseFreq = patchbay.get('noiseFreq')
      const noiseSpeed = patchbay.get('noiseSpeed')

      const hasDisplacement = dB !== 0 || dM !== 0 || dH !== 0 ||
        dSub !== 0 || dHM !== 0 || dPres !== 0 || dAir !== 0 ||
        dispAmp !== 0 || noiseAmt !== 0

      if (hasDisplacement) {
        const cU = lastSegU
        const cV = lastSegV
        const cT = lastTopology
        const pos = mainMesh.geometry.getAttribute('position') as THREE.BufferAttribute
        const norm = mainMesh.geometry.getAttribute('normal') as THREE.BufferAttribute
        const t = elapsed

        for (let j = 0; j <= cV; j++) {
          for (let i = 0; i <= cU; i++) {
            const idx = j * (cU + 1) + i
            if (idx >= pos.count) break
            const u = (i / cU) * Math.PI * 2
            const v = (j / cV) * Math.PI * 2
            const p = evaluateSurface(u, v, cT)

            // Original bands
            const bW = Math.sin(v * 2 + t * 3) * dB
            const mW = Math.sin(u * 3 + t * 5) * dM
            const hW = Math.sin(u * 8 + v * 6 + t * 8) * dH

            // Extended per-band displacement
            const subW = Math.sin(v * 1 + t * 2) * dSub
            const hmW = Math.sin(u * 5 + v * 3 + t * 6) * dHM
            const prW = Math.sin(u * 10 + v * 8 + t * 10) * dPres
            const airW = Math.sin(u * 15 + v * 12 + t * 14) * dAir

            // Custom wave
            const customW = Math.sin(u * dispFreq + v * dispFreq + t * dispSpeed) * dispAmp

            // Perlin-like noise (simplex approximation using layered sines)
            const nv = (Math.sin(u * noiseFreq + t * noiseSpeed) * Math.sin(v * noiseFreq * 0.7 + t * noiseSpeed * 1.3) +
              Math.sin(u * noiseFreq * 2.1 + v * noiseFreq * 1.7 + t * noiseSpeed * 0.8) * 0.5) * noiseAmt

            const nx = norm.getX(idx)
            const ny = norm.getY(idx)
            const nz = norm.getZ(idx)
            const d = bW + mW + hW + subW + hmW + prW + airW + customW + nv
            pos.setXYZ(idx, p.x + nx * d, p.y + ny * d, p.z + nz * d)
          }
        }
        pos.needsUpdate = true
        mainMesh.geometry.computeVertexNormals()

        // Sync overlays
        if (wireMesh && wireMesh.visible) {
          const wp = wireMesh.geometry.getAttribute('position') as THREE.BufferAttribute
          for (let i = 0; i < pos.count; i++) {
            wp.setXYZ(i, pos.getX(i), pos.getY(i), pos.getZ(i))
          }
          wp.needsUpdate = true
        }
        if (innerMesh && innerMesh.visible) {
          const ip = innerMesh.geometry.getAttribute('position') as THREE.BufferAttribute
          for (let i = 0; i < pos.count; i++) {
            ip.setXYZ(i, pos.getX(i), pos.getY(i), pos.getZ(i))
          }
          ip.needsUpdate = true
        }
        if (fresnelMesh && fresnelMesh.visible) {
          const fp = fresnelMesh.geometry.getAttribute('position') as THREE.BufferAttribute
          const fn = fresnelMesh.geometry.getAttribute('normal') as THREE.BufferAttribute
          const kn = mainMesh.geometry.getAttribute('normal') as THREE.BufferAttribute
          for (let i = 0; i < pos.count; i++) {
            fp.setXYZ(i, pos.getX(i), pos.getY(i), pos.getZ(i))
            fn.setXYZ(i, kn.getX(i), kn.getY(i), kn.getZ(i))
          }
          fp.needsUpdate = true
          fn.needsUpdate = true
        }
      }

      // ── HSL Color Modulation ──
      const mat = mainMesh.material
      let h = baseHSL.h + patchbay.get('hue')
      if (h > 1) h -= Math.floor(h)
      if (h < 0) h += Math.ceil(-h)
      mat.color.setHSL(
        h,
        Math.max(0, Math.min(1, baseHSL.s + patchbay.get('sat'))),
        Math.max(0, Math.min(1, baseHSL.l + patchbay.get('brt'))),
      )

      let eh = baseEmissiveHSL.h + patchbay.get('eHue')
      if (eh > 1) eh -= Math.floor(eh)
      if (eh < 0) eh += Math.ceil(-eh)
      mat.emissive.setHSL(eh, Math.max(0, baseEmissiveHSL.s), Math.max(0, baseEmissiveHSL.l))

      const style = getStyle()
      mat.emissiveIntensity = style.emissiveIntensity + patchbay.get('eI')
      mat.metalness = Math.max(0, Math.min(1, style.metalness + patchbay.get('met')))
      mat.roughness = Math.max(0.01, Math.min(1, style.roughness + patchbay.get('rou')))
      if (style.transparent) {
        mat.opacity = Math.max(0.05, Math.min(1, style.opacity + patchbay.get('opa')))
      }

      // Wire opacity modulation
      if (wireMesh && wireMesh.visible) {
        wireMesh.material.opacity = Math.max(0, Math.min(1, 0.15 + patchbay.get('wireOpa')))
      }

      // ── Fresnel modulation ──
      if (fresnelMesh && fresnelMesh.visible && fresnelUniforms) {
        fresnelUniforms.strength.value = 0.6 + patchbay.get('fStr')
        _color.set(style.wireColor).getHSL(_fHsl)
        let fh = _fHsl.h + patchbay.get('fHue')
        if (fh > 1) fh -= Math.floor(fh)
        if (fh < 0) fh += Math.ceil(-fh)
        fresnelUniforms.color.value.setHSL(fh, _fHsl.s, _fHsl.l)
      }

      // ── Clip plane ──
      if (clippingPlane && toggleValues['clipPlane']) {
        const clS = 1 + patchbay.get('clS')
        clippingPlane.constant = Math.sin(elapsed * 0.8 * clS) * 2
      }

      // ── Particles ──
      if (particlePoints && particlePoints.visible) {
        particlePoints.material.size = 0.03 + patchbay.get('pSz')
        particlePoints.rotation.y = elapsed * 0.1
      }

      // ── Toggle visibility sync ──
      if (wireMesh) wireMesh.visible = toggleValues['wireframe'] ?? true
      if (innerMesh) innerMesh.visible = toggleValues['innerSide'] ?? false
      if (fresnelMesh) fresnelMesh.visible = toggleValues['fresnelGlow'] ?? true
      if (particlePoints) particlePoints.visible = toggleValues['particles'] ?? false

      // Void unused temporaries
      void _emHsl
    },

    resize(_width: number, _height: number) {
      // Nothing needed — camera handled by SceneManager
    },

    dispose() {
      if (mainMesh) { mainMesh.geometry.dispose(); mainMesh.material.dispose() }
      if (wireMesh) { wireMesh.geometry.dispose(); wireMesh.material.dispose() }
      if (innerMesh) { innerMesh.geometry.dispose(); innerMesh.material.dispose() }
      if (fresnelMesh) { fresnelMesh.geometry.dispose(); fresnelMesh.material.dispose() }
      if (particlePoints) { particlePoints.geometry.dispose(); particlePoints.material.dispose() }

      if (group) {
        if (mainMesh) group.remove(mainMesh)
        if (wireMesh) group.remove(wireMesh)
        if (innerMesh) group.remove(innerMesh)
        if (fresnelMesh) group.remove(fresnelMesh)
        if (particlePoints) group.remove(particlePoints)
      }

      mainMesh = null
      wireMesh = null
      innerMesh = null
      fresnelMesh = null
      particlePoints = null
      fresnelUniforms = null
      group = null
    },

    setOpacity(opacity: number) {
      if (mainMesh) {
        mainMesh.material.opacity = opacity
        mainMesh.material.transparent = opacity < 1
      }
    },
  }

  const extended: ParametricSurfaceVisualizer = {
    ...viz,
    // Expose methods to set param/toggle from UI
    get destinations() { return DESTINATIONS },
    get paramValues() { return paramValues },
    get toggleValues() { return toggleValues },
    setParam(id: string, value: number) { paramValues[id] = value },
    setToggle(id: string, value: boolean) { toggleValues[id] = value },
    setStyle(styleId: string) {
      currentStyleId = styleId
      applyStyle()
    },
    registerDestinations(patchbay: Patchbay) {
      patchbay.registerDestinations(DESTINATIONS)
    },
  }

  return extended
}
