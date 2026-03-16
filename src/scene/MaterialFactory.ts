import * as THREE from 'three'
import type { StylePreset } from '@core/types'

export const STYLES: Record<string, StylePreset> = {
  glass: { id: 'glass', label: 'Glas', color: 0x8ecae6, emissive: 0x0a3850, emissiveIntensity: 1.0, metalness: 0.1, roughness: 0.05, opacity: 0.6, transparent: true, wireColor: 0xaad4e6, envMapIntensity: 1.5, bgColor: 0x08080e, fogDensity: 0.015 },
  obsid: { id: 'obsid', label: 'Obsid', color: 0x1a1a2e, emissive: 0x0d0d1a, emissiveIntensity: 0.3, metalness: 0.95, roughness: 0.12, opacity: 1, transparent: false, wireColor: 0x3a3a5e, envMapIntensity: 2.0, bgColor: 0x020204, fogDensity: 0.02 },
  holo: { id: 'holo', label: 'Holo', color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.0, metalness: 0.3, roughness: 0.2, opacity: 0.35, transparent: true, wireColor: 0x00ffcc, envMapIntensity: 0.5, bgColor: 0x020208, fogDensity: 0.008 },
  neon: { id: 'neon', label: 'Neon', color: 0xff2266, emissive: 0xff2266, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.15, opacity: 0.7, transparent: true, wireColor: 0xff66aa, envMapIntensity: 0.8, bgColor: 0x06020a, fogDensity: 0.012 },
  xray: { id: 'xray', label: 'X-Ray', color: 0xffffff, emissive: 0x4488cc, emissiveIntensity: 0.6, metalness: 0.0, roughness: 0.5, opacity: 0.25, transparent: true, wireColor: 0x88bbee, envMapIntensity: 0.3, bgColor: 0x000408, fogDensity: 0.01 },
  copper: { id: 'copper', label: 'Kupfer', color: 0xb87333, emissive: 0x201008, emissiveIntensity: 0.3, metalness: 0.95, roughness: 0.2, opacity: 1, transparent: false, wireColor: 0xd4955a, envMapIntensity: 1.8, bgColor: 0x0a0604, fogDensity: 0.018 },
  vapor: { id: 'vapor', label: 'Vapor', color: 0xff71ce, emissive: 0x6b20aa, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.1, opacity: 0.65, transparent: true, wireColor: 0x01cdfe, envMapIntensity: 1.0, bgColor: 0x0a0412, fogDensity: 0.012 },
  wire: { id: 'wire', label: 'Draht', color: 0x33ff99, emissive: 0x33ff99, emissiveIntensity: 1.2, metalness: 0.0, roughness: 1.0, opacity: 1, transparent: false, wireColor: 0x33ff99, envMapIntensity: 0.0, bgColor: 0x020604, fogDensity: 0.01, forceWireframe: true },
}

export interface IntersectionUniforms {
  backfaceColor: { value: THREE.Color }
  backfaceIntensity: { value: number }
  stencilGlowColor: { value: THREE.Color }
  stencilIntensity: { value: number }
  stencilThreshold: { value: number }
}

export interface MainMaterialResult {
  material: THREE.MeshStandardMaterial
  intersectionUniforms: IntersectionUniforms | null
}

export function createMainMaterial(
  style: StylePreset,
  envMap?: THREE.CubeTexture,
  clippingPlanes?: THREE.Plane[],
  enableIntersectionFX?: boolean,
): MainMaterialResult {
  const mat = new THREE.MeshStandardMaterial({
    color: style.color,
    emissive: style.emissive,
    emissiveIntensity: style.emissiveIntensity,
    metalness: style.metalness,
    roughness: style.roughness,
    transparent: style.transparent,
    opacity: style.opacity,
    side: THREE.DoubleSide,
    envMap: envMap ?? null,
    envMapIntensity: style.envMapIntensity,
    wireframe: style.forceWireframe ?? false,
    clippingPlanes: clippingPlanes ?? [],
  })

  if (!enableIntersectionFX) {
    return { material: mat, intersectionUniforms: null }
  }

  const ixUniforms: IntersectionUniforms = {
    backfaceColor: { value: new THREE.Color(style.wireColor).offsetHSL(0.5, 0, 0) },
    backfaceIntensity: { value: 0 },
    stencilGlowColor: { value: new THREE.Color(style.wireColor) },
    stencilIntensity: { value: 0 },
    stencilThreshold: { value: 0.3 },
  }

  mat.onBeforeCompile = (shader) => {
    shader.uniforms['backfaceColor'] = ixUniforms.backfaceColor
    shader.uniforms['backfaceIntensity'] = ixUniforms.backfaceIntensity
    shader.uniforms['stencilGlowColor'] = ixUniforms.stencilGlowColor
    shader.uniforms['stencilIntensity'] = ixUniforms.stencilIntensity
    shader.uniforms['stencilThreshold'] = ixUniforms.stencilThreshold

    // Declare uniforms in shader header
    shader.fragmentShader =
      'uniform vec3 backfaceColor;\nuniform float backfaceIntensity;\n' +
      'uniform vec3 stencilGlowColor;\nuniform float stencilIntensity;\nuniform float stencilThreshold;\n' +
      shader.fragmentShader

    // Inject after all standard lighting — #include <dithering_fragment> is the last include
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>

      // Backface emissive pulse
      if (!gl_FrontFacing && backfaceIntensity > 0.0) {
        gl_FragColor.rgb = backfaceColor * backfaceIntensity;
      }

      // Stencil glow approximation at fold edges
      if (!gl_FrontFacing && stencilIntensity > 0.0) {
        vec3 ixViewDir = normalize(-vViewPosition);
        float edgeFactor = abs(dot(normalize(vNormal), ixViewDir));
        if (edgeFactor < stencilThreshold) {
          float glowAmount = 1.0 - edgeFactor / stencilThreshold;
          gl_FragColor.rgb += stencilGlowColor * stencilIntensity * glowAmount;
        }
      }
      `
    )
  }

  return { material: mat, intersectionUniforms: ixUniforms }
}

export function createWireMaterial(style: StylePreset): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: style.wireColor,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

export function createInnerMaterial(style: StylePreset, clippingPlanes?: THREE.Plane[]): THREE.MeshStandardMaterial {
  const c = new THREE.Color(style.wireColor).offsetHSL(0.5, 0, 0)
  return new THREE.MeshStandardMaterial({
    color: c,
    emissive: c,
    emissiveIntensity: 0.3,
    metalness: 0.2,
    roughness: 0.4,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.5,
    clippingPlanes: clippingPlanes ?? [],
  })
}

export function createParticleMaterial(style: StylePreset): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color: style.wireColor,
    size: 0.03,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    depthWrite: false,
  })
}
