import { createStore as createZustandStore } from 'zustand/vanilla'
import type { CurveType } from '@core/types'

export interface SynoptikState {
  // Active visualizer
  activeVisualizer: string
  vizParams: Record<string, number>
  vizToggles: Record<string, boolean>
  style: string

  // Patchbay
  patches: Record<string, { source: string; amount: number; curve: CurveType; lag: number }>

  // Modulators
  lfos: Array<{ rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }>
  envelopes: Array<{ source: string; attack: number; release: number }>
  macros: Array<{ label: string; value: number; bindings: Array<{ destId: string; amount: number }> }>

  // Audio
  audioGain: number
  audioSmoothing: number
  beatSensitivity: number

  // FX
  fxParams: Record<string, number>
  fxEnabled: Record<string, boolean>

  // UI
  panelOpen: boolean
  activeTab: string
}

export interface SynoptikActions {
  setActiveVisualizer(id: string): void
  setVizParam(key: string, value: number): void
  setVizToggle(key: string, value: boolean): void
  setStyle(id: string): void
  setPatch(destId: string, source: string, amount: number, curve: CurveType, lag: number): void
  clearPatch(destId: string): void
  setLFO(index: number, update: Partial<SynoptikState['lfos'][number]>): void
  setEnvelope(index: number, update: Partial<SynoptikState['envelopes'][number]>): void
  setMacro(index: number, update: Partial<SynoptikState['macros'][number]>): void
  setAudioGain(value: number): void
  setAudioSmoothing(value: number): void
  setBeatSensitivity(value: number): void
  setFXParam(paramId: string, value: number): void
  setFXEnabled(passId: string, enabled: boolean): void
  setPanelOpen(open: boolean): void
  setActiveTab(tab: string): void
  loadState(state: Partial<SynoptikState>): void
}

const DEFAULT_STATE: SynoptikState = {
  activeVisualizer: 'parametricSurface',
  vizParams: { topology: 0, segU: 90, segV: 45, scale: 70, rotation: 25 },
  vizToggles: { wireframe: false, autoRotation: true, pulsation: true, particles: false, clipPlane: false, innerSide: false, fresnelGlow: true, spectrumRing: true, fresnelInvert: false, backfaceEmissive: false, stencilGlow: false },
  style: 'glass',
  patches: {
    // Default audio-reactive patches — mirrors the prototype's factory defaults
    dB:   { source: 'bass',   amount: 15, curve: 'linear', lag: 0 },
    dM:   { source: 'mid',    amount: 12, curve: 'linear', lag: 0 },
    dH:   { source: 'high',   amount: 10, curve: 'linear', lag: 0 },
    eI:   { source: 'energy', amount: 40, curve: 'linear', lag: 0 },
    exp:  { source: 'bass',   amount: 20, curve: 'linear', lag: 0 },
    fStr: { source: 'bass',   amount: 30, curve: 'linear', lag: 0 },
    cShk: { source: 'beat',   amount: 50, curve: 'linear', lag: 0 },
    pSpr: { source: 'beat',   amount: 60, curve: 'linear', lag: 0 },
    pBrt: { source: 'energy', amount: 40, curve: 'linear', lag: 0 },
  },
  lfos: [
    { rate: 0.5, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false },
    { rate: 0.2, waveform: 'tri', depth: 1, phaseOffset: 0, retriggerOnBeat: false },
    { rate: 1.0, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false },
    { rate: 2.0, waveform: 'sqr', depth: 1, phaseOffset: 0, retriggerOnBeat: false },
  ],
  envelopes: [
    { source: 'bass', attack: 0.01, release: 0.3 },
    { source: 'high', attack: 0.005, release: 0.15 },
    { source: 'energy', attack: 0.02, release: 0.5 },
    { source: 'mid', attack: 0.008, release: 0.2 },
  ],
  macros: [
    { label: 'Macro 1', value: 0, bindings: [] },
    { label: 'Macro 2', value: 0, bindings: [] },
    { label: 'Macro 3', value: 0, bindings: [] },
    { label: 'Macro 4', value: 0, bindings: [] },
  ],
  audioGain: 100,
  audioSmoothing: 80,
  beatSensitivity: 40,
  fxParams: {},
  fxEnabled: {},
  panelOpen: false,
  activeTab: 'Form',
}

export type Store = ReturnType<typeof createStore>

export function createStore() {
  return createZustandStore<SynoptikState & SynoptikActions>()((set) => ({
    ...DEFAULT_STATE,

    setActiveVisualizer: (id) => set({ activeVisualizer: id }),
    setVizParam: (key, value) => set((s) => ({ vizParams: { ...s.vizParams, [key]: value } })),
    setVizToggle: (key, value) => set((s) => ({ vizToggles: { ...s.vizToggles, [key]: value } })),
    setStyle: (id) => set({ style: id }),

    setPatch: (destId, source, amount, curve, lag) => set((s) => ({
      patches: { ...s.patches, [destId]: { source, amount, curve, lag } },
    })),
    clearPatch: (destId) => set((s) => {
      const patches = { ...s.patches }
      delete patches[destId]
      return { patches }
    }),

    setLFO: (index, update) => set((s) => {
      const lfos = [...s.lfos]
      const current = lfos[index]
      if (current) lfos[index] = { ...current, ...update }
      return { lfos }
    }),
    setEnvelope: (index, update) => set((s) => {
      const envelopes = [...s.envelopes]
      const current = envelopes[index]
      if (current) envelopes[index] = { ...current, ...update }
      return { envelopes }
    }),
    setMacro: (index, update) => set((s) => {
      const macros = [...s.macros]
      const current = macros[index]
      if (current) macros[index] = { ...current, ...update }
      return { macros }
    }),

    setAudioGain: (value) => set({ audioGain: value }),
    setAudioSmoothing: (value) => set({ audioSmoothing: value }),
    setBeatSensitivity: (value) => set({ beatSensitivity: value }),

    setFXParam: (paramId, value) => set((s) => ({ fxParams: { ...s.fxParams, [paramId]: value } })),
    setFXEnabled: (passId, enabled) => set((s) => ({ fxEnabled: { ...s.fxEnabled, [passId]: enabled } })),

    setPanelOpen: (open) => set({ panelOpen: open }),
    setActiveTab: (tab) => set({ activeTab: tab }),

    loadState: (state) => set(state),
  }))
}
