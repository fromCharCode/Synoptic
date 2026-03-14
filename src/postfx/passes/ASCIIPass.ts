import type { FXPass } from '@core/types'
import { createBasePass } from './BasePass'

const FRAGMENT = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float ascii_amount;
uniform float ascii_charSize;
varying vec2 vUv;

// Encode character patterns as brightness thresholds
// Chars: " .:-=+*#%@" (10 levels)
float charPattern(vec2 pos, float brightness) {
  // Step through density levels
  float level = floor(brightness * 9.0);

  // Use grid pattern to simulate character density
  vec2 p = fract(pos) - 0.5;
  float d = max(abs(p.x), abs(p.y));

  if (level < 1.0) return 0.0;                          // space
  if (level < 2.0) return step(0.45, 1.0 - d) * 0.3;   // .
  if (level < 3.0) return step(0.35, 1.0 - abs(p.x)) * step(0.45, 1.0 - abs(p.y)) * 0.4; // :
  if (level < 4.0) return step(0.4, 1.0 - abs(p.y)) * 0.5;  // -
  if (level < 5.0) return (step(0.4, 1.0 - abs(p.x)) + step(0.4, 1.0 - abs(p.y))) * 0.3; // +
  if (level < 6.0) return (step(0.35, 1.0 - abs(p.x)) + step(0.35, 1.0 - abs(p.y)) + step(0.35, 1.0 - abs(p.x + p.y)) + step(0.35, 1.0 - abs(p.x - p.y))) * 0.2; // *
  if (level < 7.0) return step(0.3, 1.0 - d) * 0.7;    // #
  if (level < 8.0) return step(0.25, 1.0 - d) * 0.8;   // %
  return step(0.2, 1.0 - d) * 0.9;                      // @
}

void main() {
  float amount = ascii_amount / 100.0;
  float charSize = 4.0 + ascii_charSize / 100.0 * 12.0;

  vec2 cellCount = resolution / charSize;
  vec2 cell = floor(vUv * cellCount);
  vec2 cellUv = fract(vUv * cellCount);

  vec2 sampleUv = (cell + 0.5) / cellCount;
  vec4 color = texture2D(tDiffuse, sampleUv);
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  float pattern = charPattern(cellUv * 3.0, lum);
  vec3 asciiColor = color.rgb * pattern * 2.5;

  vec4 orig = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(mix(orig.rgb, asciiColor, amount), orig.a);
}
`

export function createASCIIPass(): FXPass {
  return createBasePass({
    id: 'ascii',
    label: 'ASCII',
    order: 2400,
    fragmentShader: FRAGMENT,
    params: [
      { id: 'ascii.amount', label: 'Stärke', value: 0, min: 0, max: 100, group: 'ASCII' },
      { id: 'ascii.charSize', label: 'Zeichengröße', value: 50, min: 0, max: 100, group: 'ASCII' },
    ],
  })
}
