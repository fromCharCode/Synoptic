import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float crt_amount;
uniform float crt_scanlines;
uniform float crt_curvature;
uniform float crt_phosphor;
varying vec2 vUv;

vec2 curveUV(vec2 uv, float curv) {
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(6.0 - curv * 4.0);
  uv = uv + uv * offset * offset;
  uv = uv * 0.5 + 0.5;
  return uv;
}

void main() {
  float amount = crt_amount / 100.0;
  float scanIntensity = crt_scanlines / 100.0;
  float curvature = crt_curvature / 100.0;
  float phosphor = crt_phosphor / 100.0;

  vec2 uv = mix(vUv, curveUV(vUv, curvature), curvature);

  // Out-of-bounds check
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec4 color = texture2D(tDiffuse, uv);

  // Scanlines
  float scanline = sin(uv.y * resolution.y * 1.5) * 0.5 + 0.5;
  scanline = pow(scanline, 1.5) * scanIntensity;
  color.rgb -= scanline * 0.15;

  // Phosphor RGB subpixels
  float subpixel = mod(floor(uv.x * resolution.x), 3.0);
  vec3 mask = vec3(1.0);
  if (phosphor > 0.01) {
    float p = 1.0 - phosphor * 0.5;
    if (subpixel < 1.0) mask = vec3(1.0, p, p);
    else if (subpixel < 2.0) mask = vec3(p, 1.0, p);
    else mask = vec3(p, p, 1.0);
  }
  color.rgb *= mask;

  // Slight vignette for CRT effect
  vec2 vigUv = uv * (1.0 - uv);
  float vig = vigUv.x * vigUv.y * 15.0;
  vig = pow(vig, 0.25);
  color.rgb *= mix(1.0, vig, curvature * 0.5);

  vec4 orig = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(mix(orig.rgb, color.rgb, amount), orig.a);
}
`

export function createCRTPass(): FXPass {
  return createBasePass({
    id: 'crt',
    label: 'CRT',
    order: 2500,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'crt.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'CRT' },
      { id: 'crt.scanlines', label: 'Scanlines', value: 50, min: 0, max: 100, group: 'CRT' },
      { id: 'crt.curvature', label: 'Krümmung', value: 50, min: 0, max: 100, group: 'CRT' },
      { id: 'crt.phosphor', label: 'Phosphor', value: 50, min: 0, max: 100, group: 'CRT' },
    ],
  })
}
