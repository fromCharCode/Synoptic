import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float monochrome_amount;
uniform float monochrome_tintHue;
varying vec2 vUv;

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
  float amount = monochrome_amount / 100.0;
  float tintHue = monochrome_tintHue / 100.0;

  vec4 color = texture2D(tDiffuse, vUv);
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  vec3 tint = hsl2rgb(tintHue, 0.3, lum);
  vec3 mono = mix(vec3(lum), tint, 0.5);

  gl_FragColor = vec4(mix(color.rgb, mono, amount), color.a);
}
`

export function createMonochromePass(): FXPass {
  return createBasePass({
    id: 'monochrome',
    label: 'Monochrom',
    order: 2100,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'monochrome.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Monochrom' },
      { id: 'monochrome.tintHue', label: 'Tint-Farbton', value: 10, min: 0, max: 100, group: 'Monochrom' },
    ],
  })
}
