import { describe, it, expect } from 'vitest'
import { wrapHue, hslToRgb } from '../color'

describe('color utils', () => {
  describe('wrapHue', () => {
    it('wraps above 1', () => expect(wrapHue(1.3)).toBeCloseTo(0.3))
    it('wraps below 0', () => expect(wrapHue(-0.2)).toBeCloseTo(0.8))
    it('passes through 0-1', () => expect(wrapHue(0.5)).toBe(0.5))
  })
  describe('hslToRgb', () => {
    it('converts red', () => {
      const [r, g, b] = hslToRgb(0, 1, 0.5)
      expect(r).toBeCloseTo(1); expect(g).toBeCloseTo(0); expect(b).toBeCloseTo(0)
    })
    it('converts white', () => {
      const [r, g, b] = hslToRgb(0, 0, 1)
      expect(r).toBeCloseTo(1); expect(g).toBeCloseTo(1); expect(b).toBeCloseTo(1)
    })
  })
})
