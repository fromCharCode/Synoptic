import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float halftone_amount;
uniform float halftone_dotSize;
uniform float halftone_angle;
varying vec2 vUv;

#define PI 3.14159265359

void main() {
  float amount = halftone_amount / 100.0;
  float dotSize = 3.0 + halftone_dotSize / 100.0 * 15.0;
  float angle = halftone_angle / 100.0 * PI;

  vec4 color = texture2D(tDiffuse, vUv);
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  vec2 coord = vUv * resolution;
  float cs = cos(angle);
  float sn = sin(angle);
  vec2 rotated = vec2(coord.x * cs - coord.y * sn, coord.x * sn + coord.y * cs);

  vec2 grid = mod(rotated, dotSize) - dotSize * 0.5;
  float dist = length(grid) / (dotSize * 0.5);
  float dot_ = step(dist, lum);

  vec3 halftone = color.rgb * dot_;
  gl_FragColor = vec4(mix(color.rgb, halftone, amount), color.a);
}
`

export function createHalftonePass(): FXPass {
  return createBasePass({
    id: 'halftone',
    label: 'Halbton',
    order: 2200,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'halftone.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Halbton' },
      { id: 'halftone.dotSize', label: 'Punktgröße', value: 50, min: 0, max: 100, group: 'Halbton' },
      { id: 'halftone.angle', label: 'Winkel', value: 30, min: 0, max: 100, group: 'Halbton' },
    ],
  })
}
