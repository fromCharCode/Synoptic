import type * as THREE from 'three'
import { createClock } from '@core/clock'
import { createBus } from '@core/bus'
import { createRegistry } from '@core/registry'
import { createLFO } from '@modular/LFO'
import { createEnvelope } from '@modular/EnvelopeFollower'
import { createPatchbay } from '@modular/Patchbay'
import { createMacro } from '@modular/Macros'
import { createAudioEngine } from '@input/AudioEngine'
import { createAudioAnalyser, BANDS } from '@input/AudioAnalyser'
import { createSpotifyPlayer } from '@input/SpotifyPlayer'
import { createYouTubePlayer } from '@input/YouTubePlayer'
import { createSceneManager } from '@scene/SceneManager'
import { createStore } from '@state/store'
import { createFXChain } from '@postfx/FXChain'
import { createSpectrumRing } from '@ui/SpectrumRing'
import { randomizeState, deserializePreset, FACTORY_PRESETS, decodePresetURL } from '@state/presets'

// Visualizers
import { createParametricSurface } from '@visualizers/ParametricSurface'
import { createParticleField, PARTICLE_FIELD_DESTINATIONS } from '@visualizers/ParticleField'
import { createTunnel, TUNNEL_DESTINATIONS } from '@visualizers/Tunnel'
import { createTerrain, TERRAIN_DESTINATIONS } from '@visualizers/Terrain'
import { createFractal3D, FRACTAL3D_DESTINATIONS } from '@visualizers/Fractal3D'
import { createWireGlobe, WIRE_GLOBE_DESTINATIONS } from '@visualizers/WireGlobe'
import { createWaveform, WAVEFORM_DESTINATIONS } from '@visualizers/Waveform'
import { createSpectrumBars, SPECTRUM_BARS_DESTINATIONS } from '@visualizers/SpectrumBars'
import { createShaderArt, SHADER_ART_DESTINATIONS } from '@visualizers/ShaderArt'
import { createLissajous, LISSAJOUS_DESTINATIONS } from '@visualizers/Lissajous'
import { createCircularWaveform, CIRCULAR_WAVEFORM_DESTINATIONS } from '@visualizers/CircularWaveform'
import { createFluidSim, FLUID_SIM_DESTINATIONS } from '@visualizers/FluidSim'

// FX passes
import { createBloomPass } from '@postfx/passes/BloomPass'
import { createChromaticAbPass } from '@postfx/passes/ChromaticAbPass'
import { createGrainPass } from '@postfx/passes/GrainPass'
import { createVignettePass } from '@postfx/passes/VignettePass'
import { createGlitchPass } from '@postfx/passes/GlitchPass'
import { createPixelSortPass } from '@postfx/passes/PixelSortPass'
import { createDatamoshPass } from '@postfx/passes/DatamoshPass'
import { createBitCrushPass } from '@postfx/passes/BitCrushPass'
import { createFeedbackPass } from '@postfx/passes/FeedbackPass'
import { createMotionBlurPass } from '@postfx/passes/MotionBlurPass'
import { createEchoPass } from '@postfx/passes/EchoPass'
import { createDOFPass } from '@postfx/passes/DOFPass'
import { createLensDistortPass } from '@postfx/passes/LensDistortPass'
import { createAnamorphicPass } from '@postfx/passes/AnamorphicPass'
import { createKaleidoscopePass } from '@postfx/passes/KaleidoscopePass'
import { createMirrorPass } from '@postfx/passes/MirrorPass'
import { createColorGradePass } from '@postfx/passes/ColorGradePass'
import { createInvertPass } from '@postfx/passes/InvertPass'
import { createDuotonePass } from '@postfx/passes/DuotonePass'
import { createHueRotatePass } from '@postfx/passes/HueRotatePass'
import { createMonochromePass } from '@postfx/passes/MonochromePass'
import { createHalftonePass } from '@postfx/passes/HalftonePass'
import { createEdgeDetectPass } from '@postfx/passes/EdgeDetectPass'
import { createASCIIPass } from '@postfx/passes/ASCIIPass'
import { createCRTPass } from '@postfx/passes/CRTPass'

import type { Destination, Patchbay, Visualizer, FXPass } from '@core/types'
import type { Bus } from '@core/bus'
import type { Clock } from '@core/clock'
import type { Registry } from '@core/registry'
import type { LFO } from '@modular/LFO'
import type { Envelope } from '@modular/EnvelopeFollower'
import type { Macro } from '@modular/Macros'
import type { AudioEngine } from '@input/AudioEngine'
import type { AudioAnalyser } from '@input/AudioAnalyser'
import type { SpotifyPlayer } from '@input/SpotifyPlayer'
import type { YouTubePlayer } from '@input/YouTubePlayer'
import type { SceneManager } from '@scene/SceneManager'
import type { FXChain } from '@postfx/FXChain'
import type { Store } from '@state/store'
import type { ParametricSurfaceVisualizer } from '@visualizers/ParametricSurface'
import type { AppInterface } from '@ui/App'

export interface App {
  destroy(): void
  togglePause(): void
  bus: Bus
  clock: Clock
  registry: Registry
  audioEngine: AudioEngine
  audioAnalyser: AudioAnalyser | null
  spotifyPlayer: SpotifyPlayer
  youtubePlayer: YouTubePlayer
  sceneManager: SceneManager
  patchbay: Patchbay
  lfos: LFO[]
  envelopes: Envelope[]
  macros: Macro[]
  store: Store
  fxChain: FXChain
  getAppInterface(): AppInterface
  switchVisualizer(id: string): void
}

// ── Shared destinations (scene-level, lighting, post-fx placeholders) ──
const SHARED_DESTINATIONS: Destination[] = [
  // Camera
  { id: 'cDist', label: 'Cam Distance', group: 'Camera', defaultSource: 'none', defaultAmount: 0, min: -4, max: 8, colorIndex: 6 },
  { id: 'cShk', label: 'Cam Shake', group: 'Camera', defaultSource: 'none', defaultAmount: 0, min: 0, max: 0.5, colorIndex: 6 },
  { id: 'camFov', label: 'FOV', group: 'Camera', defaultSource: 'none', defaultAmount: 0, min: -30, max: 30, colorIndex: 6 },
  // Scene
  { id: 'fog', label: 'Fog', group: 'Scene', defaultSource: 'none', defaultAmount: 0, min: -0.01, max: 0.03, colorIndex: 6 },
  { id: 'exp', label: 'Exposure', group: 'Scene', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 1, colorIndex: 6 },
  // Lighting
  { id: 'keyInt', label: 'Key Light Int', group: 'Lighting', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 2, colorIndex: 7 },
  { id: 'fillInt', label: 'Fill Light Int', group: 'Lighting', defaultSource: 'none', defaultAmount: 0, min: -0.3, max: 1, colorIndex: 7 },
  { id: 'rimInt', label: 'Rim Light Int', group: 'Lighting', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 2, colorIndex: 7 },
  { id: 'keyHue', label: 'Key Hue', group: 'Lighting', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 7 },
  { id: 'fillHue', label: 'Fill Hue', group: 'Lighting', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 7 },
  { id: 'rimHue', label: 'Rim Hue', group: 'Lighting', defaultSource: 'none', defaultAmount: 0, min: -0.5, max: 0.5, colorIndex: 7 },
  // Post-FX
  { id: 'bloom', label: 'Bloom', group: 'Post-FX', defaultSource: 'none', defaultAmount: 0, min: 0, max: 1, colorIndex: 4 },
  { id: 'chrom', label: 'Chrom Ab', group: 'Post-FX', defaultSource: 'none', defaultAmount: 0, min: 0, max: 0.02, colorIndex: 4 },
  { id: 'grain', label: 'Grain', group: 'Post-FX', defaultSource: 'none', defaultAmount: 0, min: 0, max: 0.5, colorIndex: 4 },
  { id: 'vig', label: 'Vignette', group: 'Post-FX', defaultSource: 'none', defaultAmount: 0, min: 0, max: 1, colorIndex: 4 },
  // Clip plane + particle size
  { id: 'clS', label: 'Clip Speed', group: 'Scene', defaultSource: 'none', defaultAmount: 0, min: -1, max: 2, colorIndex: 6 },
  { id: 'pSz', label: 'Particle Size', group: 'Scene', defaultSource: 'none', defaultAmount: 0, min: 0, max: 0.15, colorIndex: 5 },
  { id: 'riO', label: 'Ring Opacity', group: 'Scene', defaultSource: 'none', defaultAmount: 0, min: 0, max: 1, colorIndex: 5 },
]

// Map of visualizer id -> its exported destinations
const VIZ_DESTINATION_MAP: Record<string, Destination[]> = {
  'particle-field': PARTICLE_FIELD_DESTINATIONS,
  'tunnel': TUNNEL_DESTINATIONS,
  'terrain': TERRAIN_DESTINATIONS,
  'fractal-3d': FRACTAL3D_DESTINATIONS,
  'wire-globe': WIRE_GLOBE_DESTINATIONS,
  'waveform': WAVEFORM_DESTINATIONS,
  'spectrum-bars': SPECTRUM_BARS_DESTINATIONS,
  'shader-art': SHADER_ART_DESTINATIONS,
  'lissajous': LISSAJOUS_DESTINATIONS,
  'circular-waveform': CIRCULAR_WAVEFORM_DESTINATIONS,
  'fluid-sim': FLUID_SIM_DESTINATIONS,
}

function isParametricSurface(viz: Visualizer): viz is ParametricSurfaceVisualizer {
  return viz.id === 'parametricSurface'
}

export function createApp(canvas: HTMLCanvasElement): App {
  const bus = createBus()
  const clock = createClock()
  const registry = createRegistry()
  const store = createStore()

  // Audio
  const audioEngine = createAudioEngine(bus)
  let audioAnalyser: AudioAnalyser | null = null

  // Expose audioAnalyser globally for visualizers
  Object.defineProperty(window, '__synoptikAnalyser', {
    get() { return audioAnalyser },
    configurable: true,
  })

  // Shared vizParams/vizToggles — accessible by all visualizers via window globals
  const sharedVizParams: Record<string, number> = {}
  const sharedVizToggles: Record<string, boolean> = {}

  Object.defineProperty(window, '__synoptikVizParams', {
    get() { return sharedVizParams },
    configurable: true,
  })
  Object.defineProperty(window, '__synoptikVizToggles', {
    get() { return sharedVizToggles },
    configurable: true,
  })

  // Spotify
  const spotifyPlayer = createSpotifyPlayer(audioEngine, bus)

  // YouTube
  const youtubePlayer = createYouTubePlayer(audioEngine, bus)

  // Modulators
  const lfos: LFO[] = [
    createLFO('lfo1', { rate: 0.5, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false }),
    createLFO('lfo2', { rate: 0.25, waveform: 'tri', depth: 1, phaseOffset: 0.25, retriggerOnBeat: false }),
    createLFO('lfo3', { rate: 1, waveform: 'sin', depth: 1, phaseOffset: 0.5, retriggerOnBeat: false }),
    createLFO('lfo4', { rate: 2, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false }),
  ]

  const envelopes: Envelope[] = [
    createEnvelope('env1', 'bass', 0.01, 0.15),
    createEnvelope('env2', 'mid', 0.01, 0.1),
    createEnvelope('env3', 'high', 0.005, 0.08),
    createEnvelope('env4', 'energy', 0.02, 0.2),
  ]

  const macros: Macro[] = [
    createMacro('macro1', 'Macro 1'),
    createMacro('macro2', 'Macro 2'),
    createMacro('macro3', 'Macro 3'),
    createMacro('macro4', 'Macro 4'),
  ]

  // Patchbay
  const patchbay = createPatchbay()

  // Scene
  const sceneManager = createSceneManager(canvas)
  const w = window.innerWidth
  const h = window.innerHeight

  // ── FX Chain ──
  const fxChain = createFXChain(sceneManager.renderer, w, h)
  fxChain.addPass(createBloomPass())
  fxChain.addPass(createChromaticAbPass())
  fxChain.addPass(createGrainPass())
  fxChain.addPass(createVignettePass())
  fxChain.addPass(createGlitchPass())
  fxChain.addPass(createPixelSortPass())
  fxChain.addPass(createDatamoshPass())
  fxChain.addPass(createBitCrushPass())
  fxChain.addPass(createFeedbackPass())
  fxChain.addPass(createMotionBlurPass())
  fxChain.addPass(createEchoPass())
  fxChain.addPass(createDOFPass())
  fxChain.addPass(createLensDistortPass())
  fxChain.addPass(createAnamorphicPass())
  fxChain.addPass(createKaleidoscopePass())
  fxChain.addPass(createMirrorPass())
  fxChain.addPass(createColorGradePass())
  fxChain.addPass(createInvertPass())
  fxChain.addPass(createDuotonePass())
  fxChain.addPass(createHueRotatePass())
  fxChain.addPass(createMonochromePass())
  fxChain.addPass(createHalftonePass())
  fxChain.addPass(createEdgeDetectPass())
  fxChain.addPass(createASCIIPass())
  fxChain.addPass(createCRTPass())

  // Register FX params as patchbay destinations with readable labels and sub-categories
  const FX_GROUP_MAP: Record<string, string> = {
    bloom: 'FX: Core', chrom: 'FX: Core', grain: 'FX: Core', vig: 'FX: Core',
    glitch: 'FX: Distortion', pixelsort: 'FX: Distortion', datamosh: 'FX: Distortion', bitcrush: 'FX: Distortion',
    feedback: 'FX: Feedback', motionblur: 'FX: Feedback', echo: 'FX: Feedback',
    dof: 'FX: Optical', lensdist: 'FX: Optical', anamorphic: 'FX: Optical', kaleidoscope: 'FX: Optical', mirror: 'FX: Optical',
    colorgrade: 'FX: Color', invert: 'FX: Color', duotone: 'FX: Color', huerotate: 'FX: Color', monochrome: 'FX: Color',
    halftone: 'FX: Style', edge: 'FX: Style', ascii: 'FX: Style', crt: 'FX: Style',
  }

  function makeFXDestLabel(passLabel: string, paramLabel: string): string {
    return `${passLabel} ${paramLabel}`
  }

  const fxDests: Destination[] = []
  for (const pass of fxChain.getPasses()) {
    const passPrefix = pass.id
    const fxGroup = FX_GROUP_MAP[passPrefix] ?? 'FX: Other'
    for (const p of pass.params) {
      fxDests.push({
        id: p.id,
        label: makeFXDestLabel(pass.label, p.label),
        group: fxGroup,
        defaultSource: 'none',
        defaultAmount: 50,
        min: 0,
        max: p.max,
        colorIndex: 7,
      })
    }
  }
  patchbay.registerDestinations(fxDests)

  // ── Spectrum Ring (2D overlay) ──
  const ringCanvas = document.getElementById('ring') as HTMLCanvasElement | null
  const spectrumRing = ringCanvas ? createSpectrumRing(ringCanvas) : null

  // ── Create + register ALL 12 visualizers ──
  const paramSurface = createParametricSurface()
  const particleField = createParticleField()
  const tunnel = createTunnel()
  const terrain = createTerrain()
  const fractal3D = createFractal3D()
  const wireGlobe = createWireGlobe()
  const waveform = createWaveform()
  const spectrumBars = createSpectrumBars()
  const shaderArt = createShaderArt()
  const lissajous = createLissajous()
  const circularWaveform = createCircularWaveform()
  const fluidSim = createFluidSim()

  const allVisualizers: Visualizer[] = [
    paramSurface, particleField, tunnel, terrain, fractal3D,
    wireGlobe, waveform, spectrumBars, shaderArt, lissajous,
    circularWaveform, fluidSim,
  ]

  for (const viz of allVisualizers) {
    registry.registerVisualizer(viz)
  }

  // ── Initialize active visualizer ──
  let activeVisualizer: Visualizer = paramSurface
  let activeVizDestIds: string[] = []

  const vizContext = {
    scene: sceneManager.scene,
    camera: sceneManager.camera,
    renderer: sceneManager.renderer,
    width: w,
    height: h,
  }

  function registerVizDestinations(viz: Visualizer): void {
    if (isParametricSurface(viz)) {
      viz.registerDestinations(patchbay)
      activeVizDestIds = viz.destinations.map(d => d.id)
    } else {
      const dests = VIZ_DESTINATION_MAP[viz.id]
      if (dests) {
        patchbay.registerDestinations(dests)
        activeVizDestIds = dests.map(d => d.id)
      }
    }
  }

  function unregisterVizDestinations(): void {
    if (activeVizDestIds.length > 0) {
      patchbay.unregisterDestinations(activeVizDestIds)
      activeVizDestIds = []
    }
  }

  // Register shared destinations
  patchbay.registerDestinations(SHARED_DESTINATIONS)

  // Register visualizer destinations + init
  registerVizDestinations(activeVisualizer)
  activeVisualizer.init(vizContext)

  // Update cube map once
  sceneManager.updateCubeMap()

  // ── Visualizer switching ──
  function switchVisualizer(id: string): void {
    const newViz = registry.getVisualizer(id)
    if (!newViz || newViz === activeVisualizer) return

    // Dispose old
    activeVisualizer.dispose()
    unregisterVizDestinations()

    // Init new
    activeVisualizer = newViz
    registerVizDestinations(newViz)
    newViz.init(vizContext)

    store.getState().setActiveVisualizer(id)
    bus.emit('visualizer:changed', id)
  }

  // ── Mouse / Input state ──
  let mouseX = 0
  let mouseY = 0
  let isDragging = false
  let prevMouseX = 0
  let prevMouseY = 0
  let targetRotY = 0
  let targetRotX = 0

  const onPointerMove = (e: PointerEvent) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    if (isDragging) {
      targetRotY += (e.clientX - prevMouseX) * 0.005
      targetRotX += (e.clientY - prevMouseY) * 0.005
      prevMouseX = e.clientX
      prevMouseY = e.clientY
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    isDragging = true
    prevMouseX = e.clientX
    prevMouseY = e.clientY
  }

  const onPointerUp = () => {
    isDragging = false
  }

  const onWheel = (e: WheelEvent) => {
    sceneManager.camera.position.z = Math.max(3, Math.min(20, sceneManager.camera.position.z + e.deltaY * 0.005))
  }

  const onResize = () => {
    const rw = window.innerWidth
    const rh = window.innerHeight
    sceneManager.resize(rw, rh)
    activeVisualizer.resize(rw, rh)
    fxChain.resize(rw, rh)
    if (spectrumRing) spectrumRing.resize()
  }

  window.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('resize', onResize)

  // ── Audio drag-and-drop ──
  const dzEl = document.getElementById('dz')

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (dzEl) dzEl.classList.add('active')
  }
  const onDragLeave = () => {
    if (dzEl) dzEl.classList.remove('active')
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    if (dzEl) dzEl.classList.remove('active')
    const file = e.dataTransfer?.files[0]
    if (file && file.type.startsWith('audio/')) {
      void audioEngine.connectFile(file)
    }
  }

  document.body.addEventListener('dragover', onDragOver)
  document.body.addEventListener('dragleave', onDragLeave)
  document.body.addEventListener('drop', onDrop)

  // ── Keyboard shortcuts ──
  const TOPOLOGY_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  const onKeyDown = (e: KeyboardEvent) => {
    // Don't handle if typing in an input
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return

    const key = e.key.toLowerCase()

    if (key === 'p') {
      const state = store.getState()
      state.setPanelOpen(!state.panelOpen)
    } else if (key === 'w') {
      const state = store.getState()
      state.setVizToggle('wireframe', !state.vizToggles['wireframe'])
    } else if (key === ' ') {
      e.preventDefault()
      paused = !paused
    } else if (key === 'f') {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen()
      else void document.exitFullscreen()
    } else if (key === 'm') {
      if (audioEngine.isActive) audioEngine.disconnect()
      else void audioEngine.connectMic()
    } else if (key === 'r') {
      const randomized = randomizeState()
      store.getState().loadState(randomized)
    } else if (key === 's') {
      void spotifyPlayer.connect()
    } else if (key === 'tab') {
      e.preventDefault()
      const state = store.getState()
      const tabs = ['Form', 'Patch', 'LFO', 'Audio', 'FX', 'Viz']
      const idx = tabs.indexOf(state.activeTab)
      const nextIdx = (idx + 1) % tabs.length
      state.setActiveTab(tabs[nextIdx]!)
      if (!state.panelOpen) state.setPanelOpen(true)
    } else if (key === 'escape') {
      const state = store.getState()
      if (state.panelOpen) state.setPanelOpen(false)
    } else if (TOPOLOGY_KEYS.includes(e.key)) {
      // 1-9 sets topology index (for ParametricSurface)
      const topoIdx = parseInt(e.key, 10) - 1
      if (isParametricSurface(activeVisualizer)) {
        const topoValue = topoIdx * 100
        activeVisualizer.setParam('topology', topoValue)
        store.getState().setVizParam('topology', topoValue)
        bus.emit('topology:changed', topoIdx)
      }
    }
  }

  document.addEventListener('keydown', onKeyDown)

  // ── Spotify callback check on startup ──
  if (window.location.pathname === '/callback' || window.location.search.includes('code=')) {
    void spotifyPlayer.handleCallback()
  }

  // ── Preset URL check on startup ──
  if (window.location.hash.includes('preset=')) {
    const preset = decodePresetURL(window.location.hash)
    if (preset) {
      const partial = deserializePreset(preset)
      store.getState().loadState(partial)
      bus.emit('preset:loaded', preset)
    }
  }

  // ── Audio setup on connect ──
  bus.on('audio:connected', () => {
    if (!audioAnalyser) {
      audioAnalyser = createAudioAnalyser(
        audioEngine.analyserNode,
        audioEngine.context.sampleRate,
      )
    }
  })

  bus.on('audio:disconnected', () => {
    audioAnalyser = null
  })

  // ── Sync store -> modules ──
  function syncStoreToModules(): void {
    const state = store.getState()

    // Sync LFO params
    for (let i = 0; i < lfos.length; i++) {
      const lfo = lfos[i]!
      const sLfo = state.lfos[i]
      if (sLfo) {
        lfo.rate = sLfo.rate
        lfo.depth = sLfo.depth
      }
    }

    // Sync envelope params
    for (let i = 0; i < envelopes.length; i++) {
      const env = envelopes[i]!
      const sEnv = state.envelopes[i]
      if (sEnv) {
        env.attack = sEnv.attack
        env.release = sEnv.release
        env.source = sEnv.source
      }
    }

    // Sync patches from store to patchbay
    const storePatches = state.patches
    for (const [destId, patch] of Object.entries(storePatches)) {
      patchbay.setPatch(destId, patch.source, patch.amount / 100, patch.curve, patch.lag)
    }

    // Sync FX params from store to passes
    for (const pass of fxChain.getPasses()) {
      // Check if pass is enabled in store
      const enabledVal = state.fxEnabled[pass.id]
      if (enabledVal !== undefined) {
        pass.enabled = enabledVal
      }
      // Sync pass params
      for (const param of pass.params) {
        const storeVal = state.fxParams[param.id]
        if (storeVal !== undefined) {
          param.value = storeVal
        }
      }
    }

    // Sync vizParams/vizToggles to shared globals (all visualizers can read these)
    const vizParamEntries = Object.entries(state.vizParams)
    for (let i = 0; i < vizParamEntries.length; i++) {
      const entry = vizParamEntries[i]!
      sharedVizParams[entry[0]] = entry[1]
    }
    const vizToggleEntries = Object.entries(state.vizToggles)
    for (let i = 0; i < vizToggleEntries.length; i++) {
      const entry = vizToggleEntries[i]!
      sharedVizToggles[entry[0]] = entry[1]
    }

    // Sync ParametricSurface-specific params (it uses setParam/setToggle/setStyle)
    if (isParametricSurface(activeVisualizer)) {
      for (const [key, value] of Object.entries(state.vizParams)) {
        activeVisualizer.setParam(key, value)
      }
      for (const [key, value] of Object.entries(state.vizToggles)) {
        activeVisualizer.setToggle(key, value)
      }
      activeVisualizer.setStyle(state.style)
    }

    // Sync style on scene manager
    styleId = state.style

    // Apply color/material/scene params from Form Tab to sceneManager
    const vp = state.vizParams
    if (vp['hueShift'] !== undefined || vp['saturation'] !== undefined || vp['brightness'] !== undefined) {
      const hueShift = (vp['hueShift'] ?? 0) / 360
      const satMult = (vp['saturation'] ?? 100) / 100
      const brtMult = (vp['brightness'] ?? 100) / 100
      const emissiveInt = (vp['emissiveInt'] ?? 50) / 100
      const emissiveHue = (vp['emissiveHue'] ?? 0) / 360
      const fresnelStr = (vp['fresnelStrength'] ?? 60) / 100
      const fresnelHue = (vp['fresnelHue'] ?? 0) / 360
      const metalness = (vp['metalness'] ?? 10) / 100
      const roughness = (vp['roughness'] ?? 5) / 100
      const opacity = (vp['opacity'] ?? 100) / 100
      const fogDensity = (vp['fogDensity'] ?? 15) / 1000
      const camDist = (vp['camDistance'] ?? 80) / 10
      const exposure = (vp['exposure'] ?? 130) / 100
      const bgHueVal = (vp['bgHue'] ?? 0) / 360

      // Apply to scene directly (these are base values, patchbay adds modulation on top)
      sceneManager.renderer.toneMappingExposure = exposure
      const fog = sceneManager.scene.fog
      if (fog && 'density' in fog) {
        (fog as { density: number }).density = fogDensity
      }
    }

    // Switch visualizer if changed
    if (state.activeVisualizer !== activeVisualizer.id) {
      switchVisualizer(state.activeVisualizer)
    }
  }

  // ── Animate loop ──
  let paused = false
  let lastTime = performance.now()
  let animId = 0
  let styleId = 'glass'

  // Beat pulse for spectrum ring (decays over time)
  let beatPulse = 0

  function animate() {
    animId = requestAnimationFrame(animate)

    if (paused) {
      fxChain.render(sceneManager.renderer, sceneManager.scene, sceneManager.camera)
      return
    }

    const now = performance.now()
    const dtMs = Math.min(now - lastTime, 50)
    lastTime = now

    clock.update(dtMs)
    const dt = clock.dt

    // Store sync (throttled: every 4th frame)
    if (clock.frame % 4 === 0) {
      syncStoreToModules()
    }

    // Audio analysis
    const state = store.getState()
    const gain = state.audioGain / 100
    const smoothing = state.audioSmoothing / 100
    const beatSensitivity = state.beatSensitivity / 100

    if (audioAnalyser && audioEngine.isActive) {
      audioAnalyser.update(gain, smoothing, beatSensitivity)
    }

    // LFOs
    for (const lfo of lfos) lfo.update(dt)

    // Envelopes
    for (const env of envelopes) {
      let input = 0
      if (audioAnalyser && audioEngine.isActive) {
        const bands = audioAnalyser.getBands()
        const analysis = audioAnalyser.getAnalysis()
        const bandIdx = BANDS.findIndex(b => b.id === env.source)
        if (bandIdx >= 0) {
          input = bands[bandIdx] ?? 0
        } else if (env.source === 'energy') {
          input = analysis.energy
        } else if (env.source === 'rms') {
          input = analysis.rms
        }
      }
      env.update(dt, input)
    }

    // Collect signals
    const signals: Record<string, number> = {}

    for (const lfo of lfos) {
      signals[lfo.id] = lfo.value
    }
    for (const env of envelopes) {
      signals[env.id] = env.value
    }
    for (const macro of macros) {
      signals[macro.id] = macro.value
    }

    if (audioAnalyser && audioEngine.isActive) {
      const bands = audioAnalyser.getBands()
      for (let i = 0; i < BANDS.length; i++) {
        const band = BANDS[i]
        if (band) {
          signals[band.id] = bands[i] ?? 0
        }
      }
      const analysis = audioAnalyser.getAnalysis()
      signals['energy'] = analysis.energy
      signals['peak'] = analysis.peak
      signals['rms'] = analysis.rms
      signals['centroid'] = analysis.centroid
      signals['flux'] = analysis.flux
      signals['spread'] = analysis.spread
      signals['zcr'] = analysis.zcr
      signals['crest'] = analysis.crest
      signals['beat'] = analysis.beat
      signals['onset'] = analysis.onset
      signals['rolloff'] = analysis.rolloff
      signals['loudness'] = analysis.loudness
      signals['bassRatio'] = analysis.bassRatio

      // Beat pulse for spectrum ring
      if (analysis.beat > 0.5) beatPulse = 1
    }
    beatPulse *= 0.92

    // Apply drag rotation into the kGroup
    sceneManager.kGroup.rotation.y += (targetRotY - sceneManager.kGroup.rotation.y) * 0.08
    sceneManager.kGroup.rotation.x += (targetRotX - sceneManager.kGroup.rotation.x) * 0.08

    // Patchbay
    patchbay.update(signals, dt)

    // Visualizer
    activeVisualizer.update(dt, patchbay)

    // Apply patchbay modulation to FX params
    for (const pass of fxChain.getPasses()) {
      for (const param of pass.params) {
        const mod = patchbay.get(param.id)
        if (mod !== 0) {
          param.value = (store.getState().fxParams[param.id] ?? param.value) + mod
        }
      }
    }

    // Scene
    sceneManager.update(dt, patchbay, mouseX, mouseY, styleId)

    // Render with FX chain — route 2D visualizers through their own scene/camera
    const vizWith2D = activeVisualizer as Visualizer & { __scene?: THREE.Scene; __camera?: THREE.Camera }
    const vizScene = vizWith2D.__scene
    const vizCamera = vizWith2D.__camera

    if (vizScene && vizCamera) {
      fxChain.render(sceneManager.renderer, vizScene, vizCamera)
    } else {
      fxChain.render(sceneManager.renderer, sceneManager.scene, sceneManager.camera)
    }

    // Spectrum Ring overlay
    if (spectrumRing) {
      const showRing = store.getState().vizToggles['spectrumRing'] !== false
      const freqData = (audioAnalyser && audioEngine.isActive) ? audioAnalyser.getFrequencyData() : null
      const energy = (audioAnalyser && audioEngine.isActive) ? audioAnalyser.getAnalysis().energy : 0
      spectrumRing.draw(freqData, energy, beatPulse, showRing ? 0.7 : 0)
    }
  }

  animate()

  // ── AppInterface for UI ──
  function getAppInterface(): AppInterface {
    return {
      audioEngine,
      patchbay,
      lfos,
      envelopes,
      macros,
      registry,
      spotifyPlayer,
      youtubePlayer,
      get audioAnalyser() { return audioAnalyser },
      getFXPasses(): FXPass[] { return fxChain.getPasses() },
      getLFOPhases(): number[] { return lfos.map(l => l.phase) },
    }
  }

  // ── Public API ──
  const app: App = {
    destroy() {
      cancelAnimationFrame(animId)
      window.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onKeyDown)
      document.body.removeEventListener('dragover', onDragOver)
      document.body.removeEventListener('dragleave', onDragLeave)
      document.body.removeEventListener('drop', onDrop)
      activeVisualizer.dispose()
      youtubePlayer.destroy()
      fxChain.dispose()
      sceneManager.renderer.dispose()
    },
    togglePause() {
      paused = !paused
    },
    bus,
    clock,
    registry,
    audioEngine,
    get audioAnalyser() { return audioAnalyser },
    spotifyPlayer,
    youtubePlayer,
    sceneManager,
    patchbay,
    lfos,
    envelopes,
    macros,
    store,
    fxChain,
    getAppInterface,
    switchVisualizer,
  }

  return app
}
