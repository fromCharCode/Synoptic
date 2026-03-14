import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float bloom_intensity;
uniform float bloom_threshold;
uniform float bloom_radius;
varying vec2 vUv;

void main() {
  vec2 texel = 1.0 / resolution;
  float thresh = bloom_threshold / 100.0;
  float intensity = bloom_intensity / 100.0;
  float radius = 1.0 + bloom_radius / 100.0 * 4.0;

  vec4 center = texture2D(tDiffuse, vUv);
  float lum = dot(center.rgb, vec3(0.299, 0.587, 0.114));

  vec3 bloom = vec3(0.0);
  float total = 0.0;

  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * texel * radius;
      vec4 s = texture2D(tDiffuse, vUv + offset);
      float sLum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
      float bright = max(0.0, sLum - thresh);
      float w = exp(-0.5 * (x * x + y * y) / 2.0);
      bloom += s.rgb * bright * w;
      total += w;
    }
  }

  bloom /= total;
  gl_FragColor = vec4(center.rgb + bloom * intensity * 3.0, center.a);
}
`

export function createBloomPass(): FXPass {
  return createBasePass({
    id: 'bloom',
    label: 'Bloom',
    order: 100,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'bloom.intensity', label: 'Intensität', value: 0, min: 0, max: 100, group: 'Bloom' },
      { id: 'bloom.threshold', label: 'Schwelle', value: 50, min: 0, max: 100, group: 'Bloom' },
      { id: 'bloom.radius', label: 'Radius', value: 50, min: 0, max: 100, group: 'Bloom' },
    ],
  })
}
