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
import { createSceneManager } from '@scene/SceneManager'
import { createParametricSurface } from '@visualizers/ParametricSurface'
import type { Destination, Patchbay } from '@core/types'
import type { Bus } from '@core/bus'
import type { Clock } from '@core/clock'
import type { Registry } from '@core/registry'
import type { LFO } from '@modular/LFO'
import type { Envelope } from '@modular/EnvelopeFollower'
import type { Macro } from '@modular/Macros'
import type { AudioEngine } from '@input/AudioEngine'
import type { AudioAnalyser } from '@input/AudioAnalyser'
import type { SpotifyPlayer } from '@input/SpotifyPlayer'
import type { SceneManager } from '@scene/SceneManager'

export interface App {
  destroy(): void
  togglePause(): void
  bus: Bus
  clock: Clock
  registry: Registry
  audioEngine: AudioEngine
  audioAnalyser: AudioAnalyser | null
  spotifyPlayer: SpotifyPlayer
  sceneManager: SceneManager
  patchbay: Patchbay
  lfos: LFO[]
  envelopes: Envelope[]
  macros: Macro[]
}

// ── Shared destinations (scene-level, lighting, post-fx placeholders) ──
const SHARED_DESTINATIONS: Destination[] = [
  // Camera
  { id: 'cDist', label: 'Cam Distance', group: 'Camera', defaultSource: 'none', defaultAmount: 0, min: -4, max: 8, colorIndex: 6 },
  { id: 'cShk', label: 'Cam Shake', group: 'Camera', defaultSource: 'none', defaultAmount: 0, min: 0, max: 0.5, colorIndex: 6 },
  { id: 'camFov', label: 'FOV', group: 'Camera', defaultSource: 'none', defaultAmount: 0, min: -15, max: 30, colorIndex: 6 },
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
  // Post-FX (placeholders for when post-processing is added)
  { id: 'bloom', label: 'Bloom', group: 'Post-FX', defaultSource: 'none', defaultAmount: 0, min: 0, max: 1, colorIndex: 4 },
  { id: 'chrom', label: 'Chrom Ab', group: 'Post-FX', defaultSource: 'none', defaultAmount: 0, min: 0, max: 0.02, colorIndex: 4 },
  { id: 'grain', label: 'Grain', group: 'Post-FX', defaultSource: 'none', defaultAmount: 0, min: 0, max: 0.5, colorIndex: 4 },
  { id: 'vig', label: 'Vignette', group: 'Post-FX', defaultSource: 'none', defaultAmount: 0, min: 0, max: 1, colorIndex: 4 },
  // Clip plane + particle size
  { id: 'clS', label: 'Clip Speed', group: 'Scene', defaultSource: 'none', defaultAmount: 0, min: -1, max: 2, colorIndex: 6 },
  { id: 'pSz', label: 'Particle Size', group: 'Scene', defaultSource: 'none', defaultAmount: 0, min: 0, max: 0.1, colorIndex: 5 },
]

export function createApp(canvas: HTMLCanvasElement): App {
  const bus = createBus()
  const clock = createClock()
  const registry = createRegistry()

  // Audio
  const audioEngine = createAudioEngine(bus)
  let audioAnalyser: AudioAnalyser | null = null

  // Spotify
  const spotifyPlayer = createSpotifyPlayer(audioEngine, bus)

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

  // Create + register visualizer
  const surface = createParametricSurface()
  registry.registerVisualizer(surface)

  // Register destinations
  surface.registerDestinations(patchbay)
  patchbay.registerDestinations(SHARED_DESTINATIONS)

  // Initialize visualizer
  surface.init({
    scene: sceneManager.scene,
    camera: sceneManager.camera,
    renderer: sceneManager.renderer,
    width: window.innerWidth,
    height: window.innerHeight,
  })

  // Update cube map once
  sceneManager.updateCubeMap()

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
    const w = window.innerWidth
    const h = window.innerHeight
    sceneManager.resize(w, h)
    surface.resize(w, h)
  }

  window.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('resize', onResize)

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

  // ── Animate loop ──
  let paused = false
  let lastTime = performance.now()
  let animId = 0
  let styleId = 'glass'
  const gain = 1
  const smoothing = 0.8
  const beatSensitivity = 0.5

  function animate() {
    animId = requestAnimationFrame(animate)

    if (paused) {
      sceneManager.renderer.render(sceneManager.scene, sceneManager.camera)
      return
    }

    const now = performance.now()
    const dtMs = Math.min(now - lastTime, 50)
    lastTime = now

    clock.update(dtMs)
    const dt = clock.dt

    // Audio analysis
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
        // Find band by source id
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

    // LFO signals
    for (const lfo of lfos) {
      signals[lfo.id] = lfo.value
    }

    // Envelope signals
    for (const env of envelopes) {
      signals[env.id] = env.value
    }

    // Macro signals
    for (const macro of macros) {
      signals[macro.id] = macro.value
    }

    // Audio band signals
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
    }

    // Apply drag rotation into the kGroup (before patchbay, so patches add to it)
    sceneManager.kGroup.rotation.y += (targetRotY - sceneManager.kGroup.rotation.y) * 0.08
    sceneManager.kGroup.rotation.x += (targetRotX - sceneManager.kGroup.rotation.x) * 0.08

    // Patchbay
    patchbay.update(signals, dt)

    // Visualizer
    surface.update(dt, patchbay)

    // Scene
    sceneManager.update(dt, patchbay, mouseX, mouseY, styleId)

    // Render (no post-fx yet)
    sceneManager.renderer.render(sceneManager.scene, sceneManager.camera)
  }

  animate()

  // ── Public API ──
  const app: App = {
    destroy() {
      cancelAnimationFrame(animId)
      window.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      surface.dispose()
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
    sceneManager,
    patchbay,
    lfos,
    envelopes,
    macros,
  }

  // Expose for UI / console
  void styleId
  void targetRotX
  void targetRotY

  return app
}
