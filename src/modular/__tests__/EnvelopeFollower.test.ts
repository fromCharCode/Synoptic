import { describe, it, expect } from 'vitest'
import { createEnvelope } from '../EnvelopeFollower'

describe('EnvelopeFollower', () => {
  it('starts at 0', () => {
    const env = createEnvelope('env1', 'bass', 0.01, 0.3)
    expect(env.value).toBe(0)
  })
  it('rises toward input (attack)', () => {
    const env = createEnvelope('env1', 'bass', 0.05, 0.3)
    env.update(0.016, 1.0)
    expect(env.value).toBeGreaterThan(0)
    expect(env.value).toBeLessThan(1)
  })
  it('falls toward input (release)', () => {
    const env = createEnvelope('env1', 'bass', 0.001, 0.3)
    for (let i = 0; i < 100; i++) env.update(0.016, 1.0)
    expect(env.value).toBeGreaterThan(0.9)
    env.update(0.016, 0)
    expect(env.value).toBeLessThan(1)
    expect(env.value).toBeGreaterThan(0)
  })
  it('faster attack = faster rise', () => {
    const fast = createEnvelope('e1', 'bass', 0.001, 0.3)
    const slow = createEnvelope('e2', 'bass', 0.1, 0.3)
    fast.update(0.016, 1.0); slow.update(0.016, 1.0)
    expect(fast.value).toBeGreaterThan(slow.value)
  })
})
