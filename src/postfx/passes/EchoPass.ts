import * as THREE from 'three'
import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform sampler2D tEcho0;
uniform sampler2D tEcho1;
uniform sampler2D tEcho2;
uniform sampler2D tEcho3;
uniform vec2 resolution;
uniform float time;
uniform float echo_amount;
uniform float echo_count;
uniform float echo_decay;
varying vec2 vUv;

void main() {
  float amount = echo_amount / 100.0;
  float count = 2.0 + echo_count / 100.0 * 2.0; // 2-4 echoes (we have 4 buffers)
  float decay = 0.3 + echo_decay / 100.0 * 0.6;

  vec4 current = texture2D(tDiffuse, vUv);
  vec4 result = current;

  float w = decay;
  float totalW = 1.0;

  if (count >= 1.0) { result += texture2D(tEcho0, vUv) * w; totalW += w; w *= decay; }
  if (count >= 2.0) { result += texture2D(tEcho1, vUv) * w; totalW += w; w *= decay; }
  if (count >= 3.0) { result += texture2D(tEcho2, vUv) * w; totalW += w; w *= decay; }
  if (count >= 4.0) { result += texture2D(tEcho3, vUv) * w; totalW += w; }

  result /= totalW;

  gl_FragColor = mix(current, result, amount);
}
`

const MAX_ECHOES = 4

export function createEchoPass(): FXPass {
  const echoRTs: THREE.WebGLRenderTarget[] = []
  let writeIndex = 0

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
    id: 'echo',
    label: 'Echo',
    order: 1100,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'echo.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Echo' },
      { id: 'echo.count', label: 'Anzahl', value: 50, min: 0, max: 100, group: 'Echo' },
      { id: 'echo.decay', label: 'Abklingen', value: 50, min: 0, max: 100, group: 'Echo' },
    ],
    extraUniforms: {
      tEcho0: { value: null },
      tEcho1: { value: null },
      tEcho2: { value: null },
      tEcho3: { value: null },
    },
    onInit(_renderer, width, height) {
      for (let i = 0; i < MAX_ECHOES; i++) {
        echoRTs.push(new THREE.WebGLRenderTarget(
          Math.floor(width / 2), Math.floor(height / 2),
          { format: THREE.RGBAFormat },
        ))
      }
    },
    onResize(width, height) {
      for (const rt of echoRTs) {
        rt.setSize(Math.floor(width / 2), Math.floor(height / 2))
      }
    },
    customRender(renderer, inputRT, outputRT, material, _quad, scene, camera) {
      // Set echo textures
      for (let i = 0; i < MAX_ECHOES; i++) {
        material.uniforms[`tEcho${i}`]!.value = echoRTs[i]!.texture
      }

      renderer.setRenderTarget(outputRT)
      renderer.render(scene, camera)

      // Store current frame in ring buffer
      copyMaterial.uniforms['tDiffuse']!.value = inputRT.texture
      renderer.setRenderTarget(echoRTs[writeIndex]!)
      renderer.render(copyScene, copyCamera)
      writeIndex = (writeIndex + 1) % MAX_ECHOES
    },
    onDispose() {
      for (const rt of echoRTs) rt.dispose()
      copyMaterial.dispose()
      copyQuad.geometry.dispose()
    },
  })
}
