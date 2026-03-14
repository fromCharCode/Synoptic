import * as THREE from 'three'
import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform sampler2D tAccum;
uniform vec2 resolution;
uniform float time;
uniform float motionblur_amount;
varying vec2 vUv;

void main() {
  float amount = motionblur_amount / 100.0;
  vec4 current = texture2D(tDiffuse, vUv);
  vec4 accum = texture2D(tAccum, vUv);

  float blend = amount * 0.85;
  gl_FragColor = mix(current, accum, blend);
}
`

export function createMotionBlurPass(): FXPass {
  let accumRT: THREE.WebGLRenderTarget | null = null

  const copyScene = new THREE.Scene()
  const copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const copyMaterial = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
  })
  const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial)
  copyScene.add(copyQuad)

  return createBasePass({
    id: 'motionblur',
    label: 'Motion Blur',
    order: 1000,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'motionblur.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Motion Blur' },
    ],
    extraUniforms: {
      tAccum: { value: null },
    },
    onInit(_renderer, width, height) {
      accumRT = new THREE.WebGLRenderTarget(width, height, { format: THREE.RGBAFormat })
    },
    onResize(width, height) {
      accumRT?.setSize(width, height)
    },
    customRender(renderer, _inputRT, outputRT, material, _quad, scene, camera) {
      if (!accumRT) return

      material.uniforms['tAccum']!.value = accumRT.texture

      renderer.setRenderTarget(outputRT)
      renderer.render(scene, camera)

      // Copy result to accumRT
      const source = outputRT
      if (source) {
        copyMaterial.uniforms['tDiffuse']!.value = source.texture
      }
      renderer.setRenderTarget(accumRT)
      renderer.render(copyScene, copyCamera)
    },
    onDispose() {
      accumRT?.dispose()
      copyMaterial.dispose()
      copyQuad.geometry.dispose()
    },
  })
}
