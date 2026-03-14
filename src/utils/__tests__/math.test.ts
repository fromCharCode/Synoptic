import { describe, it, expect } from 'vitest'
import { lerp, clamp, smoothstep, mapRange } from '../math'

describe('math utils', () => {
  describe('lerp', () => {
    it('returns start at t=0', () => expect(lerp(0, 10, 0)).toBe(0))
    it('returns end at t=1', () => expect(lerp(0, 10, 1)).toBe(10))
    it('returns midpoint at t=0.5', () => expect(lerp(0, 10, 0.5)).toBe(5))
  })
  describe('clamp', () => {
    it('clamps below min', () => expect(clamp(-1, 0, 1)).toBe(0))
    it('clamps above max', () => expect(clamp(2, 0, 1)).toBe(1))
    it('passes through in range', () => expect(clamp(0.5, 0, 1)).toBe(0.5))
  })
  describe('smoothstep', () => {
    it('returns 0 at t=0', () => expect(smoothstep(0)).toBe(0))
    it('returns 1 at t=1', () => expect(smoothstep(1)).toBe(1))
    it('returns 0.5 at t=0.5', () => expect(smoothstep(0.5)).toBe(0.5))
  })
  describe('mapRange', () => {
    it('maps 0-1 to 0-100', () => expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50))
    it('maps 0-100 to 0-1', () => expect(mapRange(50, 0, 100, 0, 1)).toBe(0.5))
  })
})
