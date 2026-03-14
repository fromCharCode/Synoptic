import * as THREE from 'three'
import type { FXPass, FXParam } from '@core/types'

interface PassConfig {
  id: string
  label: string
  order: number
  fragmentShader: string
  params: FXParam[]
  extraUniforms?: Record<string, THREE.IUniform>
  onInit?: (renderer: THREE.WebGLRenderer, width: number, height: number) => void
  onResize?: (width: number, height: number) => void
  customRender?: (
    renderer: THREE.WebGLRenderer,
    inputRT: THREE.WebGLRenderTarget,
    outputRT: THREE.WebGLRenderTarget | null,
    material: THREE.ShaderMaterial,
    quad: THREE.Mesh,
    scene: THREE.Scene,
    camera: THREE.Camera,
    uniforms: { time: number; dt: number },
  ) => void
  onDispose?: () => void
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

export function createBasePass(config: PassConfig): FXPass {
  const uniforms: Record<string, THREE.IUniform> = {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
    ...config.extraUniforms,
  }

  for (const p of config.params) {
    uniforms[p.id.replace('.', '_')] = { value: p.value }
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: config.fragmentShader,
  })

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  const passScene = new THREE.Scene()
  passScene.add(quad)
  const passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const pass: FXPass = {
    id: config.id,
    label: config.label,
    enabled: true,
    order: config.order,
    params: config.params,

    init(renderer, width, height) {
      uniforms['resolution']!.value.set(width, height)
      config.onInit?.(renderer, width, height)
    },

    resize(width, height) {
      uniforms['resolution']!.value.set(width, height)
      config.onResize?.(width, height)
    },

    render(renderer, inputRT, outputRT, frameUniforms) {
      uniforms['tDiffuse']!.value = inputRT.texture
      uniforms['time']!.value = frameUniforms.time

      for (const p of config.params) {
        const key = p.id.replace('.', '_')
        if (uniforms[key]) {
          uniforms[key]!.value = p.value
        }
      }

      if (config.customRender) {
        config.customRender(renderer, inputRT, outputRT, material, quad, passScene, passCamera, frameUniforms)
      } else {
        renderer.setRenderTarget(outputRT)
        renderer.render(passScene, passCamera)
      }
    },

    isActive() {
      return config.params.some(p => Math.abs(p.value) > 0.001)
    },

    dispose() {
      material.dispose()
      quad.geometry.dispose()
      config.onDispose?.()
    },
  }

  return pass
}
