import { describe, it, expect } from 'vitest'
import { createLFO } from '../LFO'

describe('LFO', () => {
  it('starts at 0 phase', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    expect(lfo.phase).toBe(0)
  })

  it('sine outputs ~0.5 at phase 0', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    expect(lfo.value).toBeCloseTo(0.5, 1)
  })

  it('advances phase over time', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(0.5)
    expect(lfo.phase).toBeCloseTo(0.5, 2)
    expect(lfo.value).toBeCloseTo(0.5, 2)
  })

  it('wraps phase past 1', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(1.5)
    expect(lfo.phase).toBeCloseTo(0.5, 2)
  })

  it('applies depth', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'sqr', depth: 0.5, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(0.1)
    expect(lfo.value).toBeCloseTo(0.5, 2)
  })

  it('applies phase offset', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0.25, retriggerOnBeat: false })
    expect(lfo.value).toBeCloseTo(0.25, 2)
  })

  it('retrigger resets phase', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: true })
    lfo.update(0.7)
    lfo.retrigger()
    expect(lfo.phase).toBe(0)
  })

  it('triangle waveform', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'tri', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(0.25)
    expect(lfo.value).toBeCloseTo(0.5, 2)
  })

  it('sample and hold produces values', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 's&h', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(0.016)
    expect(lfo.value).toBeGreaterThanOrEqual(0)
    expect(lfo.value).toBeLessThanOrEqual(1)
  })
})
