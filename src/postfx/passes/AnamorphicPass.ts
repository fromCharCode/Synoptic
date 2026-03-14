import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float anamorphic_amount;
uniform float anamorphic_spread;
varying vec2 vUv;

void main() {
  float amount = anamorphic_amount / 100.0;
  float spread = 2.0 + anamorphic_spread / 100.0 * 30.0;

  vec4 color = texture2D(tDiffuse, vUv);
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  vec3 streak = vec3(0.0);
  float total = 0.0;

  for (float i = -16.0; i <= 16.0; i += 1.0) {
    float w = exp(-0.5 * (i * i) / (spread * spread));
    vec2 offset = vec2(i / resolution.x * spread, 0.0);
    vec4 s = texture2D(tDiffuse, vUv + offset);
    float sLum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
    float bright = max(0.0, sLum - 0.5);
    streak += s.rgb * bright * w;
    total += w;
  }

  streak /= total;
  gl_FragColor = vec4(color.rgb + streak * amount * 2.0, color.a);
}
`

export function createAnamorphicPass(): FXPass {
  return createBasePass({
    id: 'anamorphic',
    label: 'Anamorphisch',
    order: 1400,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'anamorphic.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Anamorphisch' },
      { id: 'anamorphic.spread', label: 'Breite', value: 50, min: 0, max: 100, group: 'Anamorphisch' },
    ],
  })
}
