import { h } from 'preact'
import { useState, useCallback } from 'preact/hooks'
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
  onYouTubeLoad: (url: string) => void
  onYouTubePlay: () => void
  onYouTubePause: () => void
  youtubeTitle: string | null
  youtubeIsPlaying: boolean
}

export function AudioTab({
  audioMode, bands, analysis,
  audioGain, audioSmoothing, beatSensitivity,
  onConnectMic, onConnectTab, onConnectFile, onConnectSpotify, onDisconnect,
  onAudioGain, onAudioSmoothing, onBeatSensitivity,
  onYouTubeLoad, onYouTubePlay, onYouTubePause,
  youtubeTitle, youtubeIsPlaying,
}: AudioTabProps) {
  const isActive = audioMode !== null
  const [ytUrl, setYtUrl] = useState('')

  const handleYtLoad = useCallback(() => {
    if (ytUrl.trim()) {
      onYouTubeLoad(ytUrl.trim())
      setYtUrl('')
    }
  }, [ytUrl, onYouTubeLoad])

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
      <div style="font-size:6px;color:var(--fd);letter-spacing:0.5px;margin:2px 0 4px;text-align:center;opacity:0.6;">
        Spotify: https://localhost:5173/callback in Dashboard registrieren
      </div>

      <${Section} title="YouTube" />
      <div style="display:flex;gap:4px;margin:4px 0;">
        <input
          type="text"
          placeholder="YouTube URL oder Video-ID"
          value=${ytUrl}
          onInput=${(e: Event) => setYtUrl((e.target as HTMLInputElement).value)}
          onKeyDown=${(e: KeyboardEvent) => { if (e.key === 'Enter') handleYtLoad() }}
          style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:8px;padding:3px 6px;border-radius:3px;outline:none;"
        />
        <button
          onClick=${handleYtLoad}
          style="background:rgba(255,0,0,0.3);border:1px solid rgba(255,0,0,0.4);color:#fff;font-size:7px;padding:3px 8px;border-radius:3px;cursor:pointer;white-space:nowrap;"
        >Laden</button>
      </div>
      ${youtubeTitle ? html`
        <div style="font-size:7px;color:var(--fd);margin:2px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${'▶ ' + youtubeTitle}
        </div>
        <div style="display:flex;gap:4px;margin:2px 0;">
          <button
            onClick=${youtubeIsPlaying ? onYouTubePause : onYouTubePlay}
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:7px;padding:2px 8px;border-radius:3px;cursor:pointer;"
          >${youtubeIsPlaying ? 'Pause' : 'Play'}</button>
        </div>
        ${youtubeIsPlaying && !isActive ? html`
          <div style="font-size:7px;color:var(--a4);margin:4px 0;padding:4px 6px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:3px;line-height:1.5;">
            Audio-Analyse nicht verbunden. Klicke oben auf <strong>"Tab / System Audio"</strong> und wähle diesen Tab, um die Visualisierungen mit YouTube zu verbinden.
          </div>
        ` : null}
      ` : null}

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
