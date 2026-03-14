import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float colorgrade_amount;
uniform float colorgrade_look;
varying vec2 vUv;

vec3 applyLook(vec3 color, float look) {
  // 6 looks: 0=warm, 1=cool, 2=vintage, 3=neon, 4=bleach, 5=noir
  float idx = floor(look / 100.0 * 5.0);

  if (idx < 1.0) {
    // Warm: boost reds, reduce blues
    color.r = pow(color.r, 0.9);
    color.b = pow(color.b, 1.15);
    color = mix(color, color * vec3(1.1, 0.95, 0.8), 1.0);
  } else if (idx < 2.0) {
    // Cool: boost blues, reduce reds
    color.r = pow(color.r, 1.1);
    color.b = pow(color.b, 0.85);
    color = mix(color, color * vec3(0.85, 0.95, 1.15), 1.0);
  } else if (idx < 3.0) {
    // Vintage: desaturate + warm tint
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(lum), color, 0.7);
    color *= vec3(1.1, 1.0, 0.85);
    color += vec3(0.05, 0.03, 0.0);
  } else if (idx < 4.0) {
    // Neon: boost saturation + contrast
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(lum), color, 1.6);
    color = (color - 0.5) * 1.3 + 0.5;
  } else if (idx < 5.0) {
    // Bleach bypass: high contrast desaturated
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 desat = mix(vec3(lum), color, 0.5);
    color = (desat - 0.5) * 1.5 + 0.5;
  } else {
    // Noir: almost monochrome with slight sepia
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = vec3(lum) * vec3(1.0, 0.95, 0.85);
  }

  return clamp(color, 0.0, 1.0);
}

void main() {
  float amount = colorgrade_amount / 100.0;
  vec4 color = texture2D(tDiffuse, vUv);
  vec3 graded = applyLook(color.rgb, colorgrade_look);

  gl_FragColor = vec4(mix(color.rgb, graded, amount), color.a);
}
`

export function createColorGradePass(): FXPass {
  return createBasePass({
    id: 'colorgrade',
    label: 'Color Grading',
    order: 1700,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'colorgrade.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Color Grade' },
      { id: 'colorgrade.look', label: 'Look', value: 0, min: 0, max: 100, group: 'Color Grade' },
    ],
  })
}
