import * as THREE from 'three'
import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform sampler2D tPrevFrame;
uniform vec2 resolution;
uniform float time;
uniform float datamosh_amount;
uniform float datamosh_blockSize;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float amount = datamosh_amount / 100.0;
  float blockSize = 4.0 + datamosh_blockSize / 100.0 * 60.0;

  vec2 block = floor(vUv * blockSize) / blockSize;
  float r = rand(block + floor(time * 4.0));

  vec4 current = texture2D(tDiffuse, vUv);
  vec4 prev = texture2D(tPrevFrame, vUv);

  float blend = step(r, amount * 0.6) * amount;
  gl_FragColor = mix(current, prev, blend);
}
`

export function createDatamoshPass(): FXPass {
  let prevRT: THREE.WebGLRenderTarget | null = null
  let tempRT: THREE.WebGLRenderTarget | null = null

  return createBasePass({
    id: 'datamosh',
    label: 'Datamosh',
    order: 700,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'datamosh.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Datamosh' },
      { id: 'datamosh.blockSize', label: 'Blockgröße', value: 50, min: 0, max: 100, group: 'Datamosh' },
    ],
    extraUniforms: {
      tPrevFrame: { value: null },
    },
    onInit(_renderer, width, height) {
      prevRT = new THREE.WebGLRenderTarget(width, height, { format: THREE.RGBAFormat })
      tempRT = new THREE.WebGLRenderTarget(width, height, { format: THREE.RGBAFormat })
    },
    onResize(width, height) {
      prevRT?.setSize(width, height)
      tempRT?.setSize(width, height)
    },
    customRender(renderer, inputRT, outputRT, material, _quad, scene, camera) {
      if (!prevRT || !tempRT) return

      material.uniforms['tPrevFrame']!.value = prevRT.texture

      renderer.setRenderTarget(outputRT)
      renderer.render(scene, camera)

      // Copy current input to prevRT for next frame
      renderer.setRenderTarget(tempRT)
      material.uniforms['tDiffuse']!.value = inputRT.texture
      const prevMat = material.clone()
      prevMat.fragmentShader = `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tDiffuse, vUv); }
      `
      // Simple swap: store current frame as previous
      const tmp = prevRT
      prevRT = tempRT
      tempRT = tmp
    },
    onDispose() {
      prevRT?.dispose()
      tempRT?.dispose()
    },
  })
}
