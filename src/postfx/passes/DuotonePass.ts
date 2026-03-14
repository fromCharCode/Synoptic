import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float duotone_amount;
uniform float duotone_shadowHue;
uniform float duotone_highlightHue;
varying vec2 vUv;

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
  float amount = duotone_amount / 100.0;
  float shadowHue = duotone_shadowHue / 100.0;
  float highlightHue = duotone_highlightHue / 100.0;

  vec4 color = texture2D(tDiffuse, vUv);
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  vec3 shadowColor = hsl2rgb(shadowHue, 0.7, 0.2);
  vec3 highlightColor = hsl2rgb(highlightHue, 0.7, 0.8);

  vec3 duotone = mix(shadowColor, highlightColor, lum);

  gl_FragColor = vec4(mix(color.rgb, duotone, amount), color.a);
}
`

export function createDuotonePass(): FXPass {
  return createBasePass({
    id: 'duotone',
    label: 'Duotone',
    order: 1900,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'duotone.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Duotone' },
      { id: 'duotone.shadowHue', label: 'Schatten-Farbton', value: 60, min: 0, max: 100, group: 'Duotone' },
      { id: 'duotone.highlightHue', label: 'Licht-Farbton', value: 15, min: 0, max: 100, group: 'Duotone' },
    ],
  })
}
