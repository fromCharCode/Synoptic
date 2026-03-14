import type { Waveform, LFOConfig } from '@core/types'

export interface LFO {
  readonly id: string
  value: number
  phase: number
  rate: number
  waveform: Waveform
  depth: number
  phaseOffset: number
  retriggerOnBeat: boolean
  update(dt: number): void
  retrigger(): void
}

export function createLFO(id: string, config: LFOConfig): LFO {
  let phase = 0
  let shValue = Math.random()
  let shAccum = 0

  const lfo: LFO = {
    id,
    value: 0,
    get phase() { return phase },
    set phase(v) { phase = v },
    rate: config.rate,
    waveform: config.waveform,
    depth: config.depth,
    phaseOffset: config.phaseOffset,
    retriggerOnBeat: config.retriggerOnBeat,

    update(dt: number) {
      phase += lfo.rate * dt
      if (phase > 1) phase -= Math.floor(phase)

      const p = (phase + lfo.phaseOffset) % 1
      let raw: number

      switch (lfo.waveform) {
        case 'sin':
          raw = Math.sin(p * Math.PI * 2) * 0.5 + 0.5
          break
        case 'tri':
          raw = p < 0.5 ? p * 2 : (1 - p) * 2
          break
        case 'saw':
          raw = p
          break
        case 'sqr':
          raw = p < 0.5 ? 1 : 0
          break
        case 's&h':
          shAccum += dt * lfo.rate
          if (shAccum >= 1) {
            shAccum -= 1
            shValue = Math.random()
          }
          raw = shValue
          break
      }

      lfo.value = raw * lfo.depth
    },

    retrigger() {
      phase = 0
    },
  }

  // Compute initial value
  const p = lfo.phaseOffset % 1
  switch (lfo.waveform) {
    case 'sin': lfo.value = (Math.sin(p * Math.PI * 2) * 0.5 + 0.5) * lfo.depth; break
    case 'tri': lfo.value = (p < 0.5 ? p * 2 : (1 - p) * 2) * lfo.depth; break
    case 'saw': lfo.value = p * lfo.depth; break
    case 'sqr': lfo.value = (p < 0.5 ? 1 : 0) * lfo.depth; break
    case 's&h': lfo.value = shValue * lfo.depth; break
  }

  return lfo
}
