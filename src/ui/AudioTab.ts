import { h } from 'preact'
import htm from 'htm'
import { Section, AudioButton, MeterBar, Slider } from './controls'

const html = htm.bind(h)

const BAND_LABELS = ['Sub', 'Bass', 'LM', 'Mid', 'HM', 'High', 'Pres', 'Air']

const ANALYSIS_LABELS = [
  'Energy', 'Peak', 'RMS', 'Centroid', 'Flux', 'Spread',
  'ZCR', 'Crest', 'Beat', 'Onset', 'Rolloff', 'Loudness', 'BassR',
]

export interface AudioTabProps {
  audioMode: string | null
  bands: Float32Array | null
  analysis: {
    energy: number; peak: number; rms: number; centroid: number
    flux: number; spread: number; zcr: number; crest: number
    beat: number; onset: number; rolloff: number; loudness: number; bassRatio: number
  } | null
  audioGain: number
  audioSmoothing: number
  beatSensitivity: number
  onConnectMic: () => void
  onConnectTab: () => void
  onConnectFile: (file: File) => void
  onConnectSpotify: () => void
  onDisconnect: () => void
  onAudioGain: (v: number) => void
  onAudioSmoothing: (v: number) => void
  onBeatSensitivity: (v: number) => void
}

export function AudioTab({
  audioMode, bands, analysis,
  audioGain, audioSmoothing, beatSensitivity,
  onConnectMic, onConnectTab, onConnectFile, onConnectSpotify, onDisconnect,
  onAudioGain, onAudioSmoothing, onBeatSensitivity,
}: AudioTabProps) {
  const isActive = audioMode !== null

  const handleFileClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) onConnectFile(file)
    }
    input.click()
  }

  return html`
    <div class="tc active">
      <${Section} title="Audio Quelle" />
      <${AudioButton} label="Mikrofon" icon=${'🎤'} active=${audioMode === 'mic'}
        onClick=${() => isActive && audioMode === 'mic' ? onDisconnect() : onConnectMic()} />
      <${AudioButton} label="Tab Audio" icon=${'🔊'} active=${audioMode === 'tab'}
        onClick=${() => isActive && audioMode === 'tab' ? onDisconnect() : onConnectTab()} />
      <${AudioButton} label="Datei" icon=${'📁'} active=${audioMode === 'file'}
        onClick=${handleFileClick} />
      <${AudioButton} label="Spotify" icon=${'🎵'} active=${audioMode === 'spotify'}
        onClick=${() => isActive && audioMode === 'spotify' ? onDisconnect() : onConnectSpotify()} />

      <div style="font-size:7px;color:var(--fd);letter-spacing:1px;margin:6px 0 2px;text-align:center;">
        ${isActive ? `Verbunden: ${audioMode?.toUpperCase() ?? ''}` : 'Nicht verbunden'}
      </div>

      <${Section} title="Frequenz-Bander" />
      <div class="mg">
        ${BAND_LABELS.map((label, i) => {
          const value = bands ? (bands[i] ?? 0) : 0
          return html`<${MeterBar} value=${value} label=${label} />`
        })}
      </div>

      <${Section} title="Analyse" />
      <div class="mg">
        ${ANALYSIS_LABELS.map((label, i) => {
          let value = 0
          if (analysis) {
            const keys: Array<keyof NonNullable<AudioTabProps['analysis']>> = [
              'energy', 'peak', 'rms', 'centroid', 'flux', 'spread',
              'zcr', 'crest', 'beat', 'onset', 'rolloff', 'loudness', 'bassRatio',
            ]
            const key = keys[i]
            if (key) value = analysis[key]
          }
          return html`<${MeterBar} value=${value} label=${label} />`
        })}
      </div>

      <${Section} title="Empfindlichkeit" />
      <${Slider} label="Gain" value=${audioGain} min=${10} max=${300}
        onChange=${onAudioGain} />
      <${Slider} label="Smooth" value=${audioSmoothing} min=${0} max=${99}
        onChange=${onAudioSmoothing} />
      <${Slider} label="Beat" value=${beatSensitivity} min=${0} max=${100}
        onChange=${onBeatSensitivity} />
    </div>
  `
}
