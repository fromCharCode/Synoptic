import { h, render as preactRender } from 'preact'
import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import htm from 'htm'
import type { Store, SynoptikState, SynoptikActions } from '@state/store'
import type { Destination, CurveType, FXPass } from '@core/types'
import type { App } from '../app'
import type { Registry } from '@core/registry'
import { FACTORY_PRESETS, randomizeState, serializePreset, deserializePreset, saveUserPreset } from '@state/presets'
import { Panel, PanelToggle } from './Panel'
import { ShapeTab } from './ShapeTab'
import { PatchTab } from './PatchTab'
import { LFOTab } from './LFOTab'
import { AudioTab } from './AudioTab'
import { FXTab } from './FXTab'
import { VizTab } from './VizTab'

const html = htm.bind(h)

const TABS = ['Form', 'Patch', 'LFO', 'Audio', 'FX', 'Viz']

export interface AppInterface {
  audioEngine: App['audioEngine']
  patchbay: App['patchbay']
  lfos: App['lfos']
  envelopes: App['envelopes']
  macros: App['macros']
  registry: Registry
  spotifyPlayer: App['spotifyPlayer']
  audioAnalyser: App['audioAnalyser']
  getFXPasses: () => FXPass[]
  getLFOPhases: () => number[]
}

function useStore(store: Store): SynoptikState & SynoptikActions {
  const [state, setState] = useState(() => store.getState())
  const stateRef = useRef(state)

  useEffect(() => {
    const unsub = store.subscribe((newState) => {
      stateRef.current = newState
      setState(newState)
    })
    return unsub
  }, [store])

  return state
}

export function AppUI({ store, app }: { store: Store; app: AppInterface }) {
  const state = useStore(store)

  // Memoized audio state - read from app on each render
  const [audioLive, setAudioLive] = useState<{
    bands: Float32Array | null
    analysis: NonNullable<Parameters<typeof AudioTab>[0]['analysis']> | null
    mode: string | null
    lfoPhases: number[]
  }>({ bands: null, analysis: null, mode: null, lfoPhases: [] })

  // Poll audio state at ~15fps for meters
  useEffect(() => {
    let raf = 0
    let frame = 0
    function poll() {
      raf = requestAnimationFrame(poll)
      frame++
      if (frame % 4 !== 0) return // ~15fps

      const lfoPhases = app.getLFOPhases()
      const analyser = app.audioAnalyser
      if (analyser) {
        setAudioLive({
          bands: analyser.getBands(),
          analysis: analyser.getAnalysis(),
          mode: app.audioEngine.mode,
          lfoPhases,
        })
      } else {
        setAudioLive(prev => {
          if (prev.mode !== app.audioEngine.mode || prev.lfoPhases !== lfoPhases) {
            return { bands: null, analysis: null, mode: app.audioEngine.mode, lfoPhases }
          }
          return prev
        })
      }
    }
    poll()
    return () => cancelAnimationFrame(raf)
  }, [app])

  // Get destinations from patchbay
  const destinations: Destination[] = app.patchbay.getDestinations()

  // Get visualizer list from registry
  const visualizers = app.registry.getVisualizerList()

  // Get active visualizer params/toggles from registry
  const activeViz = app.registry.getVisualizer(state.activeVisualizer)
  const activeVizParams = activeViz?.params ?? []
  const activeVizToggles = activeViz?.toggles ?? []

  // Get FX passes
  const fxPasses = app.getFXPasses()

  // Handlers
  const handleTabChange = useCallback((tab: string) => {
    state.setActiveTab(tab)
  }, [state])

  const handleTogglePanel = useCallback(() => {
    state.setPanelOpen(!state.panelOpen)
  }, [state])

  const handleVizParam = useCallback((key: string, value: number) => {
    state.setVizParam(key, value)
  }, [state])

  const handleVizToggle = useCallback((key: string, value: boolean) => {
    state.setVizToggle(key, value)
  }, [state])

  const handleStyle = useCallback((id: string) => {
    state.setStyle(id)
  }, [state])

  const handlePatch = useCallback((destId: string, source: string, amount: number, curve: CurveType, lag: number) => {
    state.setPatch(destId, source, amount, curve, lag)
  }, [state])

  const handleClearPatch = useCallback((destId: string) => {
    state.clearPatch(destId)
  }, [state])

  const handleLFO = useCallback((index: number, update: Partial<SynoptikState['lfos'][number]>) => {
    state.setLFO(index, update)
  }, [state])

  const handleEnvelope = useCallback((index: number, update: Partial<SynoptikState['envelopes'][number]>) => {
    state.setEnvelope(index, update)
  }, [state])

  const handleConnectMic = useCallback(() => {
    void app.audioEngine.connectMic()
  }, [app])

  const handleConnectTab = useCallback(() => {
    void app.audioEngine.connectTabCapture()
  }, [app])

  const handleConnectFile = useCallback((file: File) => {
    void app.audioEngine.connectFile(file)
  }, [app])

  const handleConnectSpotify = useCallback(() => {
    app.spotifyPlayer.connect()
  }, [app])

  const handleDisconnect = useCallback(() => {
    app.audioEngine.disconnect()
  }, [app])

  const handleFXParam = useCallback((paramId: string, value: number) => {
    state.setFXParam(paramId, value)
  }, [state])

  const handleFXEnabled = useCallback((passId: string, enabled: boolean) => {
    state.setFXEnabled(passId, enabled)
  }, [state])

  const handleRandomize = useCallback(() => {
    const randomized = randomizeState()
    state.loadState(randomized)
  }, [state])

  const handleSave = useCallback(() => {
    const name = prompt('Preset-Name:')
    if (name) {
      const preset = serializePreset(state, name)
      saveUserPreset(name, preset)
    }
  }, [state])

  const handleReset = useCallback(() => {
    // Reset all FX params to 0 and disable all passes
    const resetParams: Record<string, number> = {}
    const resetEnabled: Record<string, boolean> = {}
    const passes = app.getFXPasses()
    for (const pass of passes) {
      resetEnabled[pass.id] = false
      for (const param of pass.params) {
        resetParams[param.id] = 0
      }
    }
    state.loadState({
      fxParams: resetParams,
      fxEnabled: resetEnabled,
    })
  }, [state, app])

  const handleLoadFactory = useCallback((name: string) => {
    const preset = FACTORY_PRESETS[name]
    if (preset) {
      const partial = deserializePreset(preset)
      state.loadState(partial)
    }
  }, [state])

  const handleSelectVisualizer = useCallback((id: string) => {
    state.setActiveVisualizer(id)
  }, [state])

  // Determine which tab content to render
  const tabContent = (() => {
    switch (state.activeTab) {
      case 'Form':
        return html`<${ShapeTab}
          visualizerId=${state.activeVisualizer}
          params=${activeVizParams}
          toggles=${activeVizToggles}
          vizParams=${state.vizParams}
          vizToggles=${state.vizToggles}
          style=${state.style}
          onVizParam=${handleVizParam}
          onVizToggle=${handleVizToggle}
          onStyle=${handleStyle}
        />`
      case 'Patch':
        return html`<${PatchTab}
          destinations=${destinations}
          patches=${state.patches}
          onPatch=${handlePatch}
          onClearPatch=${handleClearPatch}
        />`
      case 'LFO':
        return html`<${LFOTab}
          lfos=${state.lfos}
          envelopes=${state.envelopes}
          lfoPhases=${audioLive.lfoPhases}
          onLFO=${handleLFO}
          onEnvelope=${handleEnvelope}
        />`
      case 'Audio':
        return html`<${AudioTab}
          audioMode=${audioLive.mode}
          bands=${audioLive.bands}
          analysis=${audioLive.analysis}
          audioGain=${state.audioGain}
          audioSmoothing=${state.audioSmoothing}
          beatSensitivity=${state.beatSensitivity}
          onConnectMic=${handleConnectMic}
          onConnectTab=${handleConnectTab}
          onConnectFile=${handleConnectFile}
          onConnectSpotify=${handleConnectSpotify}
          onDisconnect=${handleDisconnect}
          onAudioGain=${state.setAudioGain}
          onAudioSmoothing=${state.setAudioSmoothing}
          onBeatSensitivity=${state.setBeatSensitivity}
        />`
      case 'FX':
        return html`<${FXTab}
          passes=${fxPasses}
          fxParams=${state.fxParams}
          fxEnabled=${state.fxEnabled}
          onFXParam=${handleFXParam}
          onFXEnabled=${handleFXEnabled}
          onRandomize=${handleRandomize}
          onSave=${handleSave}
          onReset=${handleReset}
          onLoadFactory=${handleLoadFactory}
          factoryPresetNames=${Object.keys(FACTORY_PRESETS)}
        />`
      case 'Viz':
        return html`<${VizTab}
          activeVisualizer=${state.activeVisualizer}
          visualizers=${visualizers}
          onSelect=${handleSelectVisualizer}
        />`
      default:
        return null
    }
  })()

  return html`
    <${PanelToggle} onClick=${handleTogglePanel} />
    <${Panel}
      tabs=${TABS}
      activeTab=${state.activeTab}
      onTabChange=${handleTabChange}
      open=${state.panelOpen}
    >
      ${tabContent}
    <//>
  `
}

export function mountUI(container: HTMLElement, store: Store, app: AppInterface) {
  preactRender(html`<${AppUI} store=${store} app=${app} />`, container)
}
