import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float glitch_amount;
uniform float glitch_blockSize;
uniform float glitch_rgbSplit;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float amount = glitch_amount / 100.0;
  float blockSize = 4.0 + glitch_blockSize / 100.0 * 60.0;
  float rgbSplit = glitch_rgbSplit / 100.0 * 0.02;

  vec2 uv = vUv;

  // Block displacement
  float blockY = floor(uv.y * blockSize) / blockSize;
  float rBlock = rand(vec2(blockY, floor(time * 8.0)));
  if (rBlock < amount * 0.3) {
    float shift = (rand(vec2(blockY, floor(time * 12.0))) - 0.5) * amount * 0.1;
    uv.x += shift;
  }

  // RGB split
  float r = texture2D(tDiffuse, uv + vec2(rgbSplit * amount, 0.0)).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - vec2(rgbSplit * amount, 0.0)).b;
  float a = texture2D(tDiffuse, uv).a;

  gl_FragColor = vec4(r, g, b, a);
}
`

export function createGlitchPass(): FXPass {
  return createBasePass({
    id: 'glitch',
    label: 'Glitch',
    order: 500,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'glitch.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'Glitch' },
      { id: 'glitch.blockSize', label: 'Blockgröße', value: 50, min: 0, max: 100, group: 'Glitch' },
      { id: 'glitch.rgbSplit', label: 'RGB Split', value: 50, min: 0, max: 100, group: 'Glitch' },
    ],
  })
}
