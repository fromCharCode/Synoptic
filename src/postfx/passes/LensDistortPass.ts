import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float lensdist_amount;
varying vec2 vUv;

void main() {
  float amount = (lensdist_amount / 100.0 - 0.5) * 2.0; // -1 to 1

  vec2 center = vUv - 0.5;
  float dist = length(center);
  float distPow = pow(dist, 2.0);

  vec2 uv = vUv + center * distPow * amount * 0.5;

  // Clamp to valid range
  uv = clamp(uv, 0.0, 1.0);

  gl_FragColor = texture2D(tDiffuse, uv);
}
`

export function createLensDistortPass(): FXPass {
  return createBasePass({
    id: 'lensdist',
    label: 'Linsenverzerrung',
    order: 1300,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'lensdist.amount', label: 'Stärke', value: 50, min: 0, max: 100, group: 'Linse' },
    ],
  })
}
