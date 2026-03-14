import { describe, it, expect } from 'vitest'
import { computeBands, computeAnalysis, BANDS } from '../AudioAnalyser'
import type { AnalysisResult } from '../AudioAnalyser'

describe('AudioAnalyser', () => {
  describe('BANDS', () => {
    it('has 8 bands', () => expect(BANDS).toHaveLength(8))
    it('covers 20Hz to 20kHz', () => {
      expect(BANDS[0].lo).toBe(20)
      expect(BANDS[BANDS.length - 1].hi).toBe(20000)
    })
  })

  describe('computeBands', () => {
    it('returns 0 for silent spectrum', () => {
      const fd = new Uint8Array(2048).fill(0)
      const prev = new Float32Array(8)
      computeBands(fd, prev, 44100, 1.0, 0.0) // smoothing 0 = instant
      expect(prev.every(v => v === 0)).toBe(true)
    })

    it('returns values 0-1 for loud spectrum', () => {
      const fd = new Uint8Array(2048).fill(200)
      const prev = new Float32Array(8)
      computeBands(fd, prev, 44100, 1.0, 0.0)
      for (let i = 0; i < 8; i++) {
        expect(prev[i]).toBeGreaterThanOrEqual(0)
        expect(prev[i]).toBeLessThanOrEqual(1)
      }
    })

    it('smoothing blends with previous values', () => {
      const fd = new Uint8Array(2048).fill(255)
      const prev = new Float32Array(8).fill(0)
      computeBands(fd, prev, 44100, 1.0, 0.8) // high smoothing
      // Should be partially risen but not at 1
      for (let i = 0; i < 8; i++) {
        expect(prev[i]).toBeGreaterThan(0)
        expect(prev[i]).toBeLessThan(1)
      }
    })
  })

  describe('computeAnalysis', () => {
    const silentAnalysis: AnalysisResult = {
      energy: 0, peak: 0, rms: 0, centroid: 0, flux: 0,
      spread: 0, zcr: 0, crest: 0, beat: 0, onset: 0,
      rolloff: 0, loudness: 0, bassRatio: 0.5,
    }

    it('energy is 0 for silence', () => {
      const fd = new Uint8Array(2048).fill(0)
      const td = new Uint8Array(4096).fill(128)
      const ps = new Float32Array(2048)
      const eh = new Float32Array(80)
      const bands = new Float32Array(8)
      const result = computeAnalysis(fd, td, ps, eh, 0, silentAnalysis, 44100, 1.0, 0.4, 0, 0, 0, bands, 0)
      expect(result.analysis.energy).toBe(0)
    })

    it('rms is low for silence', () => {
      const fd = new Uint8Array(2048).fill(0)
      const td = new Uint8Array(4096).fill(128)
      const ps = new Float32Array(2048)
      const eh = new Float32Array(80)
      const bands = new Float32Array(8)
      const result = computeAnalysis(fd, td, ps, eh, 0, silentAnalysis, 44100, 1.0, 0.4, 0, 0, 0, bands, 0)
      expect(result.analysis.rms).toBeCloseTo(0, 1)
    })

    it('energy rises for loud signal', () => {
      const fd = new Uint8Array(2048).fill(200)
      const td = new Uint8Array(4096).fill(200)
      const ps = new Float32Array(2048)
      const eh = new Float32Array(80)
      const bands = new Float32Array(8).fill(0.8)
      const result = computeAnalysis(fd, td, ps, eh, 0, silentAnalysis, 44100, 1.0, 0.4, 0, 0, 1000, bands, 0)
      expect(result.analysis.energy).toBeGreaterThan(0)
    })

    it('bassRatio is 0.5 for equal bass and high', () => {
      const fd = new Uint8Array(2048).fill(0)
      const td = new Uint8Array(4096).fill(128)
      const ps = new Float32Array(2048)
      const eh = new Float32Array(80)
      const bands = new Float32Array(8)
      bands[1] = 0.5 // bass
      bands[5] = 0.5 // high
      const result = computeAnalysis(fd, td, ps, eh, 0, silentAnalysis, 44100, 1.0, 0.4, 0, 0, 0, bands, 0)
      expect(result.analysis.bassRatio).toBeCloseTo(0.5)
    })
  })
})
