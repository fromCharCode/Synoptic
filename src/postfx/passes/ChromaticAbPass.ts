import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float chrom_amount;
varying vec2 vUv;

void main() {
  float amount = chrom_amount / 100.0 * 0.03;
  vec2 center = vec2(0.5);
  vec2 dir = vUv - center;
  float dist = length(dir);

  float rOff = amount * dist;
  float bOff = -amount * dist;

  float r = texture2D(tDiffuse, vUv + normalize(dir) * rOff).r;
  float g = texture2D(tDiffuse, vUv).g;
  float b = texture2D(tDiffuse, vUv + normalize(dir) * bOff).b;
  float a = texture2D(tDiffuse, vUv).a;

  gl_FragColor = vec4(r, g, b, a);
}
`

export function createChromaticAbPass(): FXPass {
  return createBasePass({
    id: 'chrom',
    label: 'Chromatische Aberration',
    order: 200,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'chrom.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Chromatisch' },
    ],
  })
}
