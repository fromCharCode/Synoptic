export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export function mapRange(
  value: number, inMin: number, inMax: number, outMin: number, outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}
