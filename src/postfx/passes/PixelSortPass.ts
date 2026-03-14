import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float pixelsort_amount;
uniform float pixelsort_threshold;
uniform float pixelsort_direction;
varying vec2 vUv;

void main() {
  float amount = pixelsort_amount / 100.0;
  float thresh = pixelsort_threshold / 100.0;
  float dir = pixelsort_direction / 100.0 * 3.14159;

  vec4 color = texture2D(tDiffuse, vUv);
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  if (lum > thresh) {
    vec2 offset = vec2(cos(dir), sin(dir)) * (lum - thresh) * amount * 0.05;
    color = texture2D(tDiffuse, vUv + offset);
  }

  gl_FragColor = color;
}
`

export function createPixelSortPass(): FXPass {
  return createBasePass({
    id: 'pixelsort',
    label: 'Pixel Sort',
    order: 600,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'pixelsort.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Pixel Sort' },
      { id: 'pixelsort.threshold', label: 'Schwelle', value: 50, min: 0, max: 100, group: 'Pixel Sort' },
      { id: 'pixelsort.direction', label: 'Richtung', value: 0, min: 0, max: 100, group: 'Pixel Sort' },
    ],
  })
}
