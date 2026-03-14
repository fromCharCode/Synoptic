import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float vig_amount;
uniform float vig_softness;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  float amount = vig_amount / 100.0;
  float softness = 0.2 + vig_softness / 100.0 * 0.8;

  vec2 center = vUv - 0.5;
  float dist = length(center);
  float vig = smoothstep(softness, softness - 0.3, dist);

  color.rgb *= mix(1.0, vig, amount);
  gl_FragColor = color;
}
`

export function createVignettePass(): FXPass {
  return createBasePass({
    id: 'vig',
    label: 'Vignette',
    order: 400,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'vig.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Vignette' },
      { id: 'vig.softness', label: 'Weichheit', value: 50, min: 0, max: 100, group: 'Vignette' },
    ],
  })
}
