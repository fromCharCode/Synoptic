import * as THREE from 'three'
import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform sampler2D tFeedback;
uniform vec2 resolution;
uniform float time;
uniform float feedback_amount;
uniform float feedback_zoom;
uniform float feedback_rotate;
uniform float feedback_hueShift;
varying vec2 vUv;

vec3 hueShift(vec3 color, float shift) {
  float angle = shift * 6.28318;
  float s = sin(angle);
  float c = cos(angle);
  vec3 weights = vec3(0.299, 0.587, 0.114);
  float dot_ = dot(color, weights);
  vec3 result;
  result.r = dot_ + (color.r - dot_) * c + (color.r * -0.7143 + color.g * 0.1407 + color.b * 0.5857) * s;
  result.g = dot_ + (color.g - dot_) * c + (color.r * 0.2848 + color.g * -0.2848 + color.b * -0.2848) * s;
  result.b = dot_ + (color.b - dot_) * c + (color.r * -0.1615 + color.g * -0.5615 + color.b * 0.7230) * s;
  return result;
}

void main() {
  float amount = feedback_amount / 100.0;
  float zoom = 1.0 - feedback_zoom / 100.0 * 0.05;
  float rot = feedback_rotate / 100.0 * 0.05;
  float hShift = feedback_hueShift / 100.0 * 0.02;

  vec2 center = vec2(0.5);
  vec2 uv = vUv - center;

  // Apply zoom and rotation to feedback UV
  float cs = cos(rot);
  float sn = sin(rot);
  vec2 fbUv = vec2(uv.x * cs - uv.y * sn, uv.x * sn + uv.y * cs) * zoom + center;

  vec4 current = texture2D(tDiffuse, vUv);
  vec4 fb = texture2D(tFeedback, fbUv);

  fb.rgb = hueShift(fb.rgb, hShift);
  fb.rgb *= 0.98; // Slight decay to prevent blowout

  gl_FragColor = vec4(mix(current.rgb, max(current.rgb, fb.rgb), amount), current.a);
}
`

export function createFeedbackPass(): FXPass {
  let fbA: THREE.WebGLRenderTarget | null = null
  let fbB: THREE.WebGLRenderTarget | null = null
  let toggle = false

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
    id: 'feedback',
    label: 'Feedback',
    order: 900,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'feedback.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Feedback' },
      { id: 'feedback.zoom', label: 'Zoom', value: 50, min: 0, max: 100, group: 'Feedback' },
      { id: 'feedback.rotate', label: 'Rotation', value: 50, min: 0, max: 100, group: 'Feedback' },
      { id: 'feedback.hueShift', label: 'Farbverschiebung', value: 0, min: 0, max: 100, group: 'Feedback' },
    ],
    extraUniforms: {
      tFeedback: { value: null },
    },
    onInit(_renderer, width, height) {
      fbA = new THREE.WebGLRenderTarget(width, height, { format: THREE.RGBAFormat })
      fbB = new THREE.WebGLRenderTarget(width, height, { format: THREE.RGBAFormat })
    },
    onResize(width, height) {
      fbA?.setSize(width, height)
      fbB?.setSize(width, height)
    },
    customRender(renderer, inputRT, outputRT, material, _quad, scene, camera) {
      if (!fbA || !fbB) return

      const readFB = toggle ? fbA : fbB
      const writeFB = toggle ? fbB : fbA

      material.uniforms['tFeedback']!.value = readFB.texture

      renderer.setRenderTarget(outputRT)
      renderer.render(scene, camera)

      // Copy output to writeFB for next frame
      const copySource = outputRT ?? inputRT
      copyMaterial.uniforms['tDiffuse']!.value = copySource.texture
      renderer.setRenderTarget(writeFB)
      renderer.render(copyScene, copyCamera)

      toggle = !toggle
    },
    onDispose() {
      fbA?.dispose()
      fbB?.dispose()
      copyMaterial.dispose()
      copyQuad.geometry.dispose()
    },
  })
}
