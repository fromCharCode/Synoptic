import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float grain_amount;
uniform float grain_speed;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  float amount = grain_amount / 100.0;
  float speed = 1.0 + grain_speed / 100.0 * 10.0;

  float noise = rand(vUv * resolution + vec2(time * speed)) * 2.0 - 1.0;
  color.rgb += noise * amount * 0.3;

  gl_FragColor = color;
}
`

export function createGrainPass(): FXPass {
  return createBasePass({
    id: 'grain',
    label: 'Film Grain',
    order: 300,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'grain.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Grain' },
      { id: 'grain.speed', label: 'Geschwindigkeit', value: 50, min: 0, max: 100, group: 'Grain' },
    ],
  })
}
