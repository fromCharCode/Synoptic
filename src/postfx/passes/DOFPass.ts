import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float dof_amount;
uniform float dof_focalDist;
uniform float dof_aperture;
varying vec2 vUv;

void main() {
  float amount = dof_amount / 100.0;
  float focalDist = dof_focalDist / 100.0;
  float aperture = 0.5 + dof_aperture / 100.0 * 4.5;

  vec2 texel = 1.0 / resolution;
  vec2 center = vec2(0.5);
  float dist = length(vUv - center);
  float coc = abs(dist - focalDist) * aperture * amount;

  vec4 color = vec4(0.0);
  float total = 0.0;

  int samples = 8;
  for (int i = 0; i < 8; i++) {
    float angle = float(i) * 0.785398;
    for (float r = 1.0; r <= 3.0; r += 1.0) {
      vec2 offset = vec2(cos(angle), sin(angle)) * r * coc * texel * 3.0;
      color += texture2D(tDiffuse, vUv + offset);
      total += 1.0;
    }
  }

  color /= total;
  vec4 sharp = texture2D(tDiffuse, vUv);
  gl_FragColor = mix(sharp, color, clamp(coc * 10.0, 0.0, 1.0));
}
`

export function createDOFPass(): FXPass {
  return createBasePass({
    id: 'dof',
    label: 'Tiefenschärfe',
    order: 1200,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'dof.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'DOF' },
      { id: 'dof.focalDist', label: 'Fokus-Distanz', value: 50, min: 0, max: 100, group: 'DOF' },
      { id: 'dof.aperture', label: 'Blende', value: 50, min: 0, max: 100, group: 'DOF' },
    ],
  })
}
