import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float huerotate_amount;
varying vec2 vUv;

vec3 hueShift(vec3 color, float shift) {
  float angle = shift * 6.28318;
  float s = sin(angle);
  float c = cos(angle);
  vec3 w = vec3(0.299, 0.587, 0.114);
  float dot_ = dot(color, w);
  vec3 result;
  result.r = dot_ + (color.r - dot_) * c + (color.r * -0.7143 + color.g * 0.1407 + color.b * 0.5857) * s;
  result.g = dot_ + (color.g - dot_) * c + (color.r * 0.2848 + color.g * -0.2848 + color.b * -0.2848) * s;
  result.b = dot_ + (color.b - dot_) * c + (color.r * -0.1615 + color.g * -0.5615 + color.b * 0.7230) * s;
  return result;
}

void main() {
  float amount = huerotate_amount / 100.0;
  vec4 color = texture2D(tDiffuse, vUv);
  vec3 shifted = hueShift(color.rgb, amount);

  gl_FragColor = vec4(shifted, color.a);
}
`

export function createHueRotatePass(): FXPass {
  return createBasePass({
    id: 'huerotate',
    label: 'Farbverschiebung',
    order: 2000,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'huerotate.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Hue Rotate' },
    ],
  })
}
