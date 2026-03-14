import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float bitcrush_colorDepth;
uniform float bitcrush_pixelSize;
varying vec2 vUv;

void main() {
  float colorDepth = 2.0 + bitcrush_colorDepth / 100.0 * 254.0;
  float pixelSize = 1.0 + bitcrush_pixelSize / 100.0 * 16.0;

  vec2 uv = floor(vUv * resolution / pixelSize) * pixelSize / resolution;
  vec4 color = texture2D(tDiffuse, uv);

  color.rgb = floor(color.rgb * colorDepth) / colorDepth;

  gl_FragColor = color;
}
`

export function createBitCrushPass(): FXPass {
  return createBasePass({
    id: 'bitcrush',
    label: 'Bit Crush',
    order: 800,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'bitcrush.colorDepth', label: 'Farbtiefe', value: 0, min: 0, max: 100, group: 'Bit Crush' },
      { id: 'bitcrush.pixelSize', label: 'Pixelgröße', value: 0, min: 0, max: 100, group: 'Bit Crush' },
    ],
  })
}
