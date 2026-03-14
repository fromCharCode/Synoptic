import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float mirror_horizontal;
uniform float mirror_vertical;
uniform float mirror_diagonal;
varying vec2 vUv;

void main() {
  float h = mirror_horizontal / 100.0;
  float v = mirror_vertical / 100.0;
  float d = mirror_diagonal / 100.0;

  vec2 uv = vUv;
  vec4 orig = texture2D(tDiffuse, uv);

  // Horizontal mirror (left to right)
  vec2 hUv = vec2(1.0 - uv.x, uv.y);
  vec4 hColor = texture2D(tDiffuse, uv.x > 0.5 ? hUv : uv);

  // Vertical mirror (top to bottom)
  vec2 vUv2 = vec2(uv.x, 1.0 - uv.y);
  vec4 vColor = texture2D(tDiffuse, uv.y > 0.5 ? vUv2 : uv);

  // Diagonal mirror
  vec2 dUv = vec2(uv.y, uv.x);
  vec4 dColor = texture2D(tDiffuse, dUv);

  vec4 result = orig;
  result = mix(result, hColor, h);
  result = mix(result, vColor, v);
  result = mix(result, dColor, d);

  gl_FragColor = result;
}
`

export function createMirrorPass(): FXPass {
  return createBasePass({
    id: 'mirror',
    label: 'Spiegel',
    order: 1600,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'mirror.horizontal', label: 'Horizontal', value: 0, min: 0, max: 100, group: 'Spiegel' },
      { id: 'mirror.vertical', label: 'Vertikal', value: 0, min: 0, max: 100, group: 'Spiegel' },
      { id: 'mirror.diagonal', label: 'Diagonal', value: 0, min: 0, max: 100, group: 'Spiegel' },
    ],
  })
}
