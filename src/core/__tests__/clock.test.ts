import { describe, it, expect } from 'vitest'
import { createClock } from '../clock'

describe('Clock', () => {
  it('starts at zero', () => {
    const clock = createClock()
    expect(clock.elapsed).toBe(0)
    expect(clock.frame).toBe(0)
    expect(clock.dt).toBe(0)
  })
  it('advances on update', () => {
    const clock = createClock()
    clock.update(16.67)
    expect(clock.dt).toBeCloseTo(0.01667, 3)
    expect(clock.elapsed).toBeCloseTo(0.01667, 3)
    expect(clock.frame).toBe(1)
  })
  it('caps dt at 50ms', () => {
    const clock = createClock()
    clock.update(200)
    expect(clock.dt).toBe(0.05)
  })
  it('accumulates elapsed time', () => {
    const clock = createClock()
    clock.update(16.67); clock.update(16.67); clock.update(16.67)
    expect(clock.elapsed).toBeCloseTo(0.05, 2)
    expect(clock.frame).toBe(3)
  })
})
