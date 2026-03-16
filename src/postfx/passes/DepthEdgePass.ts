import * as THREE from 'three'
import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 resolution;
uniform float time;
uniform float cameraNear;
uniform float cameraFar;
uniform float depthEdge_amount;
uniform float depthEdge_thickness;
uniform float depthEdge_glowColor;
varying vec2 vUv;

float linearizeDepth(float d, float near, float far) {
  return near * far / (far - d * (far - near));
}

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

void main() {
  float amount = depthEdge_amount / 100.0;
  float thickness = 1.0 + depthEdge_thickness / 100.0 * 3.0;
  float glowHue = depthEdge_glowColor / 100.0;

  vec2 texel = thickness / resolution;

  // Sample and linearize depth (Sobel 3x3)
  float tl = linearizeDepth(texture2D(tDepth, vUv + vec2(-texel.x, texel.y)).r, cameraNear, cameraFar);
  float t  = linearizeDepth(texture2D(tDepth, vUv + vec2(0.0, texel.y)).r, cameraNear, cameraFar);
  float tr = linearizeDepth(texture2D(tDepth, vUv + vec2(texel.x, texel.y)).r, cameraNear, cameraFar);
  float l_ = linearizeDepth(texture2D(tDepth, vUv + vec2(-texel.x, 0.0)).r, cameraNear, cameraFar);
  float r_ = linearizeDepth(texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r, cameraNear, cameraFar);
  float bl = linearizeDepth(texture2D(tDepth, vUv + vec2(-texel.x, -texel.y)).r, cameraNear, cameraFar);
  float b  = linearizeDepth(texture2D(tDepth, vUv + vec2(0.0, -texel.y)).r, cameraNear, cameraFar);
  float br = linearizeDepth(texture2D(tDepth, vUv + vec2(texel.x, -texel.y)).r, cameraNear, cameraFar);

  float gx = -tl - 2.0 * l_ - bl + tr + 2.0 * r_ + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = sqrt(gx * gx + gy * gy);

  // Normalize edge relative to depth range
  float center = linearizeDepth(texture2D(tDepth, vUv).r, cameraNear, cameraFar);
  edge = edge / max(center * 0.1, 0.01);
  edge = clamp(edge, 0.0, 1.0);

  vec3 glowColor = hsl2rgb(glowHue, 1.0, 0.6);
  vec3 edgeColor = glowColor * edge * 2.0;

  vec4 color = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(mix(color.rgb, color.rgb + edgeColor, amount), color.a);
}
`

export function createDepthEdgePass(): FXPass {
  return createBasePass({
    id: 'depthEdge',
    label: 'Tiefenkanten',
    order: 2350,
    fragmentShader: FRAGMENT,
    extraUniforms: {
      tDepth: { value: null as THREE.DepthTexture | null },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 200 },
    },
    params: [
      { id: 'depthEdge.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Tiefenkanten' },
      { id: 'depthEdge.thickness', label: 'Dicke', value: 50, min: 0, max: 100, group: 'Tiefenkanten' },
      { id: 'depthEdge.glowColor', label: 'Leuchtfarbe', value: 50, min: 0, max: 100, group: 'Tiefenkanten' },
    ],
  })
}
