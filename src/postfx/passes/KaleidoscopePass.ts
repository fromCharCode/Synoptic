import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float kaleidoscope_amount;
uniform float kaleidoscope_segments;
varying vec2 vUv;

#define PI 3.14159265359

void main() {
  float amount = kaleidoscope_amount / 100.0;
  float segments = 2.0 + floor(kaleidoscope_segments / 100.0 * 10.0);

  vec2 center = vUv - 0.5;
  float angle = atan(center.y, center.x);
  float radius = length(center);

  float segmentAngle = PI * 2.0 / segments;
  angle = mod(angle, segmentAngle);
  if (angle > segmentAngle * 0.5) {
    angle = segmentAngle - angle;
  }

  vec2 kalUv = vec2(cos(angle), sin(angle)) * radius + 0.5;
  vec4 kalColor = texture2D(tDiffuse, kalUv);
  vec4 origColor = texture2D(tDiffuse, vUv);

  gl_FragColor = mix(origColor, kalColor, amount);
}
`

export function createKaleidoscopePass(): FXPass {
  return createBasePass({
    id: 'kaleidoscope',
    label: 'Kaleidoskop',
    order: 1500,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'kaleidoscope.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Kaleidoskop' },
      { id: 'kaleidoscope.segments', label: 'Segmente', value: 50, min: 0, max: 100, group: 'Kaleidoskop' },
    ],
  })
}
