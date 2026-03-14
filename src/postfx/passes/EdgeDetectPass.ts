import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float edge_amount;
uniform float edge_thickness;
uniform float edge_glowColor;
varying vec2 vUv;

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
  float amount = edge_amount / 100.0;
  float thickness = 1.0 + edge_thickness / 100.0 * 3.0;
  float glowHue = edge_glowColor / 100.0;

  vec2 texel = thickness / resolution;

  // Sobel operator
  float tl = dot(texture2D(tDiffuse, vUv + vec2(-texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float t  = dot(texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float tr = dot(texture2D(tDiffuse, vUv + vec2(texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float l_ = dot(texture2D(tDiffuse, vUv + vec2(-texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float r_ = dot(texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float bl = dot(texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float b  = dot(texture2D(tDiffuse, vUv + vec2(0.0, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float br = dot(texture2D(tDiffuse, vUv + vec2(texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));

  float gx = -tl - 2.0 * l_ - bl + tr + 2.0 * r_ + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = sqrt(gx * gx + gy * gy);

  vec3 glowColor = hsl2rgb(glowHue, 1.0, 0.6);
  vec3 edgeColor = glowColor * edge * 2.0;

  vec4 color = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(mix(color.rgb, color.rgb + edgeColor, amount), color.a);
}
`

export function createEdgeDetectPass(): FXPass {
  return createBasePass({
    id: 'edge',
    label: 'Kantenerkennung',
    order: 2300,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'edge.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Kanten' },
      { id: 'edge.thickness', label: 'Dicke', value: 50, min: 0, max: 100, group: 'Kanten' },
      { id: 'edge.glowColor', label: 'Leuchtfarbe', value: 50, min: 0, max: 100, group: 'Kanten' },
    ],
  })
}
