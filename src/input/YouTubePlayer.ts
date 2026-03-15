/// <reference types="vite/client" />
import type { AudioEngine } from './AudioEngine'
import type { Bus } from '@core/bus'

export interface YouTubePlayer {
  readonly isPlaying: boolean
  readonly videoTitle: string | null
  loadVideo(urlOrId: string): void
  play(): void
  pause(): void
  destroy(): void
}

/** YouTube IFrame API player instance shape (subset we use) */
interface YTPlayerInstance {
  loadVideoById(videoId: string): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
  getVideoData(): { title: string }
}

/** YouTube IFrame API constructor options */
interface YTPlayerOptions {
  height: string
  width: string
  videoId: string
  playerVars: Record<string, number | string>
  events: {
    onReady: (e: { target: YTPlayerInstance }) => void
    onStateChange: (e: { data: number }) => void
  }
}

/** Global YT namespace injected by the IFrame API script */
interface YTNamespace {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayerInstance
  PlayerState: {
    PLAYING: number
    PAUSED: number
    ENDED: number
  }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const VIDEO_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/

function extractVideoId(urlOrId: string): string | null {
  // If it already looks like a bare video ID (11 chars, valid charset)
  if (/^[A-Za-z0-9_-]{11}$/.test(urlOrId)) return urlOrId
  const match = VIDEO_ID_RE.exec(urlOrId)
  return match?.[1] ?? null
}

function loadIframeAPI(): Promise<YTNamespace> {
  return new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) resolve(window.YT)
      else reject(new Error('YT namespace missing after API ready'))
    }

    if (!document.getElementById('yt-iframe-api')) {
      const script = document.createElement('script')
      script.id = 'yt-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      const head = document.head ?? document.documentElement
      head.appendChild(script)
    }
  })
}

async function tryTabCapture(audioEngine: AudioEngine, bus: Bus): Promise<void> {
  // Use the standard tab capture method — works in Firefox and Chrome.
  // The user will be prompted to select a tab/window, then audio is
  // routed through analyser AND to speakers.
  try {
    await audioEngine.connectTabCapture()
  } catch {
    bus.emit('error', { source: 'youtube', message: 'Tab-Audio-Capture fehlgeschlagen — bitte manuell über Audio Tab verbinden' })
  }
}

export function createYouTubePlayer(audioEngine: AudioEngine, bus: Bus): YouTubePlayer {
  let playing = false
  let videoTitle: string | null = null
  let ytPlayer: YTPlayerInstance | null = null
  let ytReady = false
  let pendingVideoId: string | null = null

  const container = document.getElementById('yt-player')

  async function ensurePlayer(): Promise<void> {
    if (ytPlayer) return

    const YT = await loadIframeAPI()

    if (!container) return

    // Create inner div for the player to replace
    let inner = document.getElementById('yt-player-inner')
    if (!inner) {
      inner = document.createElement('div')
      inner.id = 'yt-player-inner'
      container.appendChild(inner)
    }

    return new Promise<void>((resolve) => {
      ytPlayer = new YT.Player('yt-player-inner', {
        height: '135',
        width: '240',
        videoId: '',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            ytReady = true
            if (pendingVideoId && ytPlayer) {
              ytPlayer.loadVideoById(pendingVideoId)
              pendingVideoId = null
            }
            resolve()
          },
          onStateChange: (e) => {
            const YTState = window.YT?.PlayerState
            if (!YTState) return
            if (e.data === YTState.PLAYING) {
              playing = true
              videoTitle = ytPlayer?.getVideoData().title ?? null
            } else if (e.data === YTState.PAUSED || e.data === YTState.ENDED) {
              playing = false
            }
          },
        },
      })
    })
  }

  const player: YouTubePlayer = {
    get isPlaying() { return playing },
    get videoTitle() { return videoTitle },

    loadVideo(urlOrId: string) {
      const id = extractVideoId(urlOrId)
      if (!id) {
        bus.emit('error', { source: 'youtube', message: 'Ungültige YouTube-URL oder Video-ID' })
        return
      }

      if (container) container.style.display = 'block'

      if (ytReady && ytPlayer) {
        ytPlayer.loadVideoById(id)
        // Try to capture tab audio for FFT analysis
        void tryTabCapture(audioEngine, bus)
      } else {
        pendingVideoId = id
        void ensurePlayer().then(() => {
          void tryTabCapture(audioEngine, bus)
        })
      }
    },

    play() {
      if (ytPlayer) ytPlayer.playVideo()
    },

    pause() {
      if (ytPlayer) ytPlayer.pauseVideo()
    },

    destroy() {
      if (ytPlayer) {
        ytPlayer.destroy()
        ytPlayer = null
      }
      ytReady = false
      playing = false
      videoTitle = null
      pendingVideoId = null
      if (container) {
        container.style.display = 'none'
        container.innerHTML = ''
      }
    },
  }

  return player
}
