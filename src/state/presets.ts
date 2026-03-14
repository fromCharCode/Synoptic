import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { SynoptikPreset, CurveType } from '@core/types'
import type { SynoptikState } from './store'

// Serialize current state to a preset
export function serializePreset(state: SynoptikState, name: string): SynoptikPreset {
  return {
    version: 2,
    name,
    created: new Date().toISOString(),
    visualizer: state.activeVisualizer,
    vizParams: { ...state.vizParams },
    vizToggles: { ...state.vizToggles },
    style: state.style,
    patches: JSON.parse(JSON.stringify(state.patches)) as SynoptikPreset['patches'],
    lfos: state.lfos.map((l) => ({ ...l })),
    envelopes: state.envelopes.map((e) => ({ ...e })),
    macros: state.macros.map((m) => ({ ...m, bindings: m.bindings.map((b) => ({ ...b })) })),
    fx: { ...state.fxParams },
    fxEnabled: { ...state.fxEnabled },
  }
}

// Deserialize a preset into partial state
export function deserializePreset(preset: SynoptikPreset): Partial<SynoptikState> {
  // SynoptikPreset.patches uses curve: string; cast to store's stricter type
  const patches = Object.fromEntries(
    Object.entries(preset.patches).map(([k, v]) => [
      k,
      { source: v.source, amount: v.amount, curve: v.curve as CurveType, lag: v.lag },
    ]),
  ) satisfies SynoptikState['patches']

  return {
    activeVisualizer: preset.visualizer,
    vizParams: preset.vizParams,
    vizToggles: preset.vizToggles,
    ...(preset.style !== undefined ? { style: preset.style } : {}),
    patches,
    lfos: preset.lfos.map((l) => ({ ...l })),
    envelopes: preset.envelopes.map((e) => ({ ...e })),
    macros: preset.macros.map((m) => ({ ...m, bindings: m.bindings.map((b) => ({ ...b })) })),
    fxParams: preset.fx,
    fxEnabled: preset.fxEnabled,
  }
}

// Migrate old preset formats
export function migratePreset(raw: Record<string, unknown>): SynoptikPreset {
  // Cast patches record: each entry is { source, amount, curve, lag }
  const rawPatches = (raw['patches'] ?? {}) as Record<string, { source: string; amount: number; curve: string; lag: number }>
  const patches: SynoptikPreset['patches'] = {}
  for (const [key, patch] of Object.entries(rawPatches)) {
    // Handle pres → presence band rename
    patches[key] = { ...patch, source: patch.source === 'pres' ? 'presence' : patch.source }
  }

  return {
    version: 2,
    name: String(raw['name'] ?? ''),
    created: String(raw['created'] ?? new Date().toISOString()),
    visualizer: String(raw['visualizer'] ?? 'parametricSurface'),
    vizParams: (raw['vizParams'] ?? {}) as Record<string, number>,
    vizToggles: (raw['vizToggles'] ?? {}) as Record<string, boolean>,
    style: raw['style'] !== undefined ? String(raw['style']) : undefined,
    patches,
    lfos: (raw['lfos'] ?? []) as SynoptikPreset['lfos'],
    envelopes: (raw['envelopes'] ?? []) as SynoptikPreset['envelopes'],
    macros: (raw['macros'] ?? []) as SynoptikPreset['macros'],
    fx: (raw['fx'] ?? {}) as Record<string, number>,
    fxEnabled: (raw['fxEnabled'] ?? {}) as Record<string, boolean>,
  }
}

// localStorage operations
const STORAGE_KEY = 'synoptik_presets'

export function saveUserPreset(name: string, preset: SynoptikPreset): void {
  const all = loadAllUserPresets()
  all[name] = preset
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function loadAllUserPresets(): Record<string, SynoptikPreset> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, SynoptikPreset>
  } catch {
    return {}
  }
}

export function deleteUserPreset(name: string): void {
  const all = loadAllUserPresets()
  delete all[name]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

// URL sharing
export function encodePresetURL(preset: SynoptikPreset): string {
  const json = JSON.stringify(preset)
  const compressed = compressToEncodedURIComponent(json)
  return `${window.location.origin}/#preset=${compressed}`
}

export function decodePresetURL(hash: string): SynoptikPreset | null {
  try {
    const match = hash.match(/preset=(.+)/)
    if (!match?.[1]) return null
    const json = decompressFromEncodedURIComponent(match[1])
    if (!json) return null
    return migratePreset(JSON.parse(json) as Record<string, unknown>)
  } catch {
    return null
  }
}

// Factory presets
export const FACTORY_PRESETS: Record<string, SynoptikPreset> = {
  'Ambient Glass': {
    version: 2, name: 'Ambient Glass', created: '2026-01-01', visualizer: 'parametricSurface',
    vizParams: { topology: 0, segU: 90, segV: 45, scale: 70, rotation: 25 },
    vizToggles: { wireframe: false, autoRotation: true, pulsation: true, particles: false, clipPlane: false, innerSide: false, fresnelGlow: true, spectrumRing: true },
    style: 'glass',
    patches: { hue: { source: 'lfo1', amount: 60, curve: 'linear', lag: 0 }, eI: { source: 'energy', amount: 60, curve: 'linear', lag: 0 }, fStr: { source: 'bass', amount: 65, curve: 'linear', lag: 0 } },
    lfos: [{ rate: 0.3, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 0.1, waveform: 'tri', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 2, waveform: 'sqr', depth: 1, phaseOffset: 0, retriggerOnBeat: false }],
    envelopes: [{ source: 'bass', attack: 0.01, release: 0.3 }, { source: 'high', attack: 0.005, release: 0.15 }, { source: 'energy', attack: 0.02, release: 0.5 }, { source: 'mid', attack: 0.008, release: 0.2 }],
    macros: [{ label: 'Macro 1', value: 0, bindings: [] }, { label: 'Macro 2', value: 0, bindings: [] }, { label: 'Macro 3', value: 0, bindings: [] }, { label: 'Macro 4', value: 0, bindings: [] }],
    fx: { 'bloom.intensity': 30, 'chrom.amount': 5, 'grain.amount': 5, 'vig.amount': 30 },
    fxEnabled: { bloom: true, grain: true, vig: true },
  },
  'Neon Pulse': {
    version: 2, name: 'Neon Pulse', created: '2026-01-01', visualizer: 'parametricSurface',
    vizParams: { topology: 0, segU: 90, segV: 45, scale: 70, rotation: 25 },
    vizToggles: { wireframe: false, autoRotation: true, pulsation: true, particles: false, clipPlane: false, innerSide: false, fresnelGlow: true, spectrumRing: true },
    style: 'neon',
    patches: { hue: { source: 'beat', amount: 70, curve: 'linear', lag: 0 }, sat: { source: 'bass', amount: 65, curve: 'linear', lag: 0 }, eI: { source: 'energy', amount: 70, curve: 'linear', lag: 0 }, dB: { source: 'bass', amount: 65, curve: 'linear', lag: 0 }, cShk: { source: 'beat', amount: 55, curve: 'linear', lag: 0 } },
    lfos: [{ rate: 2, waveform: 'sqr', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 0.5, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 2, waveform: 'sqr', depth: 1, phaseOffset: 0, retriggerOnBeat: false }],
    envelopes: [{ source: 'bass', attack: 0.01, release: 0.3 }, { source: 'high', attack: 0.005, release: 0.15 }, { source: 'energy', attack: 0.02, release: 0.5 }, { source: 'mid', attack: 0.008, release: 0.2 }],
    macros: [{ label: 'Macro 1', value: 0, bindings: [] }, { label: 'Macro 2', value: 0, bindings: [] }, { label: 'Macro 3', value: 0, bindings: [] }, { label: 'Macro 4', value: 0, bindings: [] }],
    fx: { 'bloom.intensity': 50, 'chrom.amount': 15, 'grain.amount': 12, 'vig.amount': 40 },
    fxEnabled: { bloom: true, chrom: true, grain: true, vig: true },
  },
  'Alien Morph': {
    version: 2, name: 'Alien Morph', created: '2026-01-01', visualizer: 'parametricSurface',
    vizParams: { topology: 400, segU: 90, segV: 45, scale: 70, rotation: 25 },
    vizToggles: { wireframe: false, autoRotation: true, pulsation: true, particles: false, clipPlane: false, innerSide: false, fresnelGlow: true, spectrumRing: true },
    style: 'holo',
    patches: { topo: { source: 'lfo2', amount: 70, curve: 'linear', lag: 0 }, hue: { source: 'centroid', amount: 65, curve: 'linear', lag: 0 }, dB: { source: 'bass', amount: 60, curve: 'linear', lag: 0 }, dM: { source: 'mid', amount: 55, curve: 'linear', lag: 0 }, sU: { source: 'lfo1', amount: 60, curve: 'linear', lag: 0 } },
    lfos: [{ rate: 0.8, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 0.05, waveform: 'tri', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 2, waveform: 'sqr', depth: 1, phaseOffset: 0, retriggerOnBeat: false }],
    envelopes: [{ source: 'bass', attack: 0.01, release: 0.3 }, { source: 'high', attack: 0.005, release: 0.15 }, { source: 'energy', attack: 0.02, release: 0.5 }, { source: 'mid', attack: 0.008, release: 0.2 }],
    macros: [{ label: 'Macro 1', value: 0, bindings: [] }, { label: 'Macro 2', value: 0, bindings: [] }, { label: 'Macro 3', value: 0, bindings: [] }, { label: 'Macro 4', value: 0, bindings: [] }],
    fx: { 'bloom.intensity': 25, 'chrom.amount': 8, 'grain.amount': 3, 'vig.amount': 25 },
    fxEnabled: { bloom: true, chrom: true, grain: true, vig: true },
  },
  'Vapor Dream': {
    version: 2, name: 'Vapor Dream', created: '2026-01-01', visualizer: 'parametricSurface',
    vizParams: { topology: 200, segU: 90, segV: 45, scale: 70, rotation: 25 },
    vizToggles: { wireframe: false, autoRotation: true, pulsation: true, particles: false, clipPlane: false, innerSide: false, fresnelGlow: true, spectrumRing: true },
    style: 'vapor',
    patches: { hue: { source: 'lfo1', amount: 65, curve: 'linear', lag: 0 }, brt: { source: 'rms', amount: 55, curve: 'linear', lag: 0 }, eHue: { source: 'lfo2', amount: 60, curve: 'linear', lag: 0 }, fHue: { source: 'lfo3', amount: 55, curve: 'linear', lag: 0 }, exp: { source: 'bass', amount: 60, curve: 'linear', lag: 0 } },
    lfos: [{ rate: 0.15, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 0.08, waveform: 'tri', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 0.3, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 2, waveform: 'sqr', depth: 1, phaseOffset: 0, retriggerOnBeat: false }],
    envelopes: [{ source: 'bass', attack: 0.01, release: 0.3 }, { source: 'high', attack: 0.005, release: 0.15 }, { source: 'energy', attack: 0.02, release: 0.5 }, { source: 'mid', attack: 0.008, release: 0.2 }],
    macros: [{ label: 'Macro 1', value: 0, bindings: [] }, { label: 'Macro 2', value: 0, bindings: [] }, { label: 'Macro 3', value: 0, bindings: [] }, { label: 'Macro 4', value: 0, bindings: [] }],
    fx: { 'bloom.intensity': 40, 'chrom.amount': 20, 'grain.amount': 15, 'vig.amount': 50 },
    fxEnabled: { bloom: true, chrom: true, grain: true, vig: true },
  },
  'Glitch Box': {
    version: 2, name: 'Glitch Box', created: '2026-01-01', visualizer: 'parametricSurface',
    vizParams: { topology: 800, segU: 90, segV: 45, scale: 70, rotation: 25 },
    vizToggles: { wireframe: false, autoRotation: true, pulsation: true, particles: false, clipPlane: false, innerSide: false, fresnelGlow: true, spectrumRing: true },
    style: 'wire',
    patches: { sU: { source: 'beat', amount: 75, curve: 'linear', lag: 0 }, sV: { source: 'lfo4', amount: 65, curve: 'linear', lag: 0 }, topo: { source: 'lfo3', amount: 70, curve: 'linear', lag: 0 }, hue: { source: 'flux', amount: 70, curve: 'linear', lag: 0 }, cShk: { source: 'beat', amount: 60, curve: 'linear', lag: 0 } },
    lfos: [{ rate: 4, waveform: 's&h', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 1, waveform: 'sqr', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 3, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false }, { rate: 8, waveform: 's&h', depth: 1, phaseOffset: 0, retriggerOnBeat: false }],
    envelopes: [{ source: 'bass', attack: 0.01, release: 0.3 }, { source: 'high', attack: 0.005, release: 0.15 }, { source: 'energy', attack: 0.02, release: 0.5 }, { source: 'mid', attack: 0.008, release: 0.2 }],
    macros: [{ label: 'Macro 1', value: 0, bindings: [] }, { label: 'Macro 2', value: 0, bindings: [] }, { label: 'Macro 3', value: 0, bindings: [] }, { label: 'Macro 4', value: 0, bindings: [] }],
    fx: { 'bloom.intensity': 20, 'chrom.amount': 30, 'grain.amount': 25, 'vig.amount': 20 },
    fxEnabled: { bloom: true, chrom: true, grain: true, vig: true },
  },
}

// Randomize state
export function randomizeState(): Partial<SynoptikState> {
  const styles = ['glass', 'obsid', 'holo', 'neon', 'xray', 'copper', 'vapor', 'wire']
  const waveforms = ['sin', 'tri', 'saw', 'sqr', 's&h']
  const sources = ['none', 'sub', 'bass', 'lowmid', 'mid', 'himid', 'high', 'presence', 'air', 'energy', 'peak', 'rms', 'centroid', 'flux', 'spread', 'zcr', 'crest', 'beat', 'lfo1', 'lfo2', 'lfo3', 'lfo4', 'env1', 'env2', 'env3', 'env4']

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min)

  const patches: SynoptikState['patches'] = {}
  const destIds = ['scale', 'rotX', 'rotY', 'rotZ', 'dB', 'dM', 'dH', 'hue', 'sat', 'brt', 'eHue', 'eI', 'fStr', 'fHue', 'met', 'rou', 'opa', 'cShk', 'exp']
  for (const d of destIds) {
    if (Math.random() < 0.4) {
      patches[d] = { source: pick(sources), amount: rand(10, 80), curve: 'linear' as CurveType, lag: 0 }
    }
  }

  return {
    style: pick(styles),
    vizParams: { topology: rand(0, 800), segU: 90, segV: 45, scale: 70, rotation: 25 },
    patches,
    lfos: Array.from({ length: 4 }, () => ({
      rate: Math.random() * 4 + 0.05,
      waveform: pick(waveforms),
      depth: Math.random() * 0.8 + 0.2,
      phaseOffset: Math.random(),
      retriggerOnBeat: Math.random() < 0.3,
    })),
    fxParams: {
      'bloom.intensity': rand(0, 60),
      'chrom.amount': rand(0, 30),
      'grain.amount': rand(0, 20),
      'vig.amount': rand(0, 50),
    },
  }
}
