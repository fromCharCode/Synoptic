import type * as THREE from 'three'

export interface Signal {
  id: string
  label: string
  value: number        // 0–1 normalized
  group: string
}

export type CurveType = 'linear' | 'exp' | 'log' | 'step'

export interface Patch {
  sourceId: string
  destId: string
  amount: number       // -1..+1
  curve: CurveType
  lag: number          // 0–1
}

export interface Destination {
  id: string
  label: string
  group: string
  defaultSource: string
  defaultAmount: number
  min: number
  max: number
  colorIndex: number
}

export interface StylePreset {
  id: string
  label: string
  color: number
  emissive: number
  emissiveIntensity: number
  metalness: number
  roughness: number
  opacity: number
  transparent: boolean
  wireColor: number
  envMapIntensity: number
  bgColor: number
  fogDensity: number
  forceWireframe?: boolean
}

export type VisualizerCategory = 'surface' | '3d' | '2d'

export interface VisualizerParam {
  id: string
  label: string
  type: 'slider' | 'select'
  min?: number
  max?: number
  default: number
  options?: Array<{ value: number; label: string }>
  group: string
}

export interface VisualizerToggle {
  id: string
  label: string
  default: boolean
}

export interface VisualizerContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  canvas2d?: CanvasRenderingContext2D
  width: number
  height: number
}

export interface Visualizer {
  id: string
  name: string
  category: VisualizerCategory
  description: string
  params: VisualizerParam[]
  toggles: VisualizerToggle[]
  init(context: VisualizerContext): void
  update(dt: number, patchbay: Patchbay): void
  resize(width: number, height: number): void
  dispose(): void
  setOpacity(opacity: number): void
}

export interface FXParam {
  id: string
  label: string
  value: number
  min: number
  max: number
  group: string
}

export interface FXPass {
  id: string
  label: string
  enabled: boolean
  order: number
  params: FXParam[]
  init(renderer: THREE.WebGLRenderer, width: number, height: number): void
  resize(width: number, height: number): void
  render(
    renderer: THREE.WebGLRenderer,
    inputRT: THREE.WebGLRenderTarget,
    outputRT: THREE.WebGLRenderTarget | null,
    uniforms: { time: number; dt: number },
  ): void
  isActive(): boolean
  dispose(): void
}

export type Waveform = 'sin' | 'tri' | 'saw' | 'sqr' | 's&h'

export interface LFOConfig {
  rate: number
  waveform: Waveform
  depth: number
  phaseOffset: number
  retriggerOnBeat: boolean
}

export interface MacroBinding {
  destId: string
  amount: number
}

export interface MacroConfig {
  id: string
  label: string
  value: number
  bindings: MacroBinding[]
}

export interface SynoptikPreset {
  version: 2
  name: string
  created: string
  visualizer: string
  vizParams: Record<string, number>
  vizToggles: Record<string, boolean>
  style?: string
  patches: Record<string, { source: string; amount: number; curve: string; lag: number }>
  lfos: Array<{ rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }>
  envelopes: Array<{ source: string; attack: number; release: number }>
  macros: Array<{ label: string; value: number; bindings: Array<{ destId: string; amount: number }> }>
  fx: Record<string, number>
  fxEnabled: Record<string, boolean>
}

export interface BusEvents {
  'beat:detected': void
  'onset:detected': void
  'preset:loaded': SynoptikPreset
  'audio:connected': { mode: 'mic' | 'tab' | 'file' | 'spotify' }
  'audio:disconnected': void
  'visualizer:changed': string
  'topology:changed': number
  'style:changed': string
  'error': { source: string; message: string }
}

export interface Patchbay {
  get(destId: string): number
  update(signals: Record<string, number>, dt: number): void
  setPatch(destId: string, sourceId: string, amount: number, curve: CurveType, lag: number): void
  clearPatch(destId: string): void
  registerDestinations(dests: Destination[]): void
  unregisterDestinations(ids: string[]): void
  getDestinations(): Destination[]
  getPatches(): Map<string, { sourceId: string; amount: number; curve: CurveType; lag: number }>
}
