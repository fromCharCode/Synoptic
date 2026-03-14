import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float invert_amount;
varying vec2 vUv;

void main() {
  float amount = invert_amount / 100.0;
  vec4 color = texture2D(tDiffuse, vUv);
  vec3 inverted = 1.0 - color.rgb;

  gl_FragColor = vec4(mix(color.rgb, inverted, amount), color.a);
}
`

export function createInvertPass(): FXPass {
  return createBasePass({
    id: 'invert',
    label: 'Invertieren',
    order: 1800,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'invert.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Invertieren' },
    ],
  })
}
