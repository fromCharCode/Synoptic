import type { Bus } from '@core/bus'

type AudioMode = 'mic' | 'tab' | 'file' | 'spotify' | null

export interface AudioEngine {
  readonly context: AudioContext
  readonly analyserNode: AnalyserNode
  readonly mode: AudioMode
  readonly isActive: boolean
  readonly isPaused: boolean
  connectMic(): Promise<void>
  connectTabCapture(): Promise<void>
  connectFile(file: File): Promise<void>
  connectSpotify(stream: MediaStream): void
  disconnect(): void
  pause(): void
  resume(): void
}

export function createAudioEngine(bus: Bus): AudioEngine {
  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null
  let stream: MediaStream | null = null
  let audioElement: HTMLAudioElement | null = null
  let mode: AudioMode = null
  let paused = false

  function ensureContext(): { ctx: AudioContext; analyser: AnalyserNode } {
    if (!ctx) {
      ctx = new AudioContext()
      analyser = ctx.createAnalyser()
      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0.8
    }
    return { ctx: ctx!, analyser: analyser! }
  }

  function cleanupSource() {
    paused = false
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
    if (audioElement) { audioElement.pause(); audioElement.src = ''; audioElement = null }
    if (source) { try { source.disconnect() } catch { /* ignore */ } source = null }
    if (analyser) { try { analyser.disconnect() } catch { /* ignore */ } }
  }

  const engine: AudioEngine = {
    get context() { return ensureContext().ctx },
    get analyserNode() { return ensureContext().analyser },
    get mode() { return mode },
    get isActive() { return mode !== null },
    get isPaused() { return paused },

    async connectMic() {
      const { ctx: c, analyser: a } = ensureContext()
      cleanupSource()
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        source = c.createMediaStreamSource(stream)
        source.connect(a)
        mode = 'mic'
        bus.emit('audio:connected', { mode: 'mic' })
      } catch {
        bus.emit('error', { source: 'audio', message: 'Mikrofon-Zugriff verweigert' })
      }
    },

    async connectTabCapture() {
      const { ctx: c, analyser: a } = ensureContext()
      cleanupSource()
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        displayStream.getVideoTracks().forEach(t => t.stop())
        const audioTracks = displayStream.getAudioTracks()
        if (audioTracks.length === 0) {
          bus.emit('error', { source: 'audio', message: 'Kein Audio im ausgewählten Tab' })
          return
        }
        stream = new MediaStream(audioTracks)
        source = c.createMediaStreamSource(stream)
        source.connect(a)
        a.connect(c.destination)
        mode = 'tab'
        bus.emit('audio:connected', { mode: 'tab' })
        audioTracks[0]!.onended = () => engine.disconnect()
      } catch {
        bus.emit('error', { source: 'audio', message: 'Tab-Capture abgelehnt' })
      }
    },

    async connectFile(file: File) {
      const { ctx: c, analyser: a } = ensureContext()
      cleanupSource()
      audioElement = new Audio()
      audioElement.crossOrigin = 'anonymous'
      audioElement.src = URL.createObjectURL(file)
      audioElement.loop = true
      source = c.createMediaElementSource(audioElement)
      source.connect(a)
      a.connect(c.destination)
      await audioElement.play()
      mode = 'file'
      bus.emit('audio:connected', { mode: 'file' })
    },

    connectSpotify(mediaStream: MediaStream) {
      const { ctx: c, analyser: a } = ensureContext()
      cleanupSource()
      stream = mediaStream
      source = c.createMediaStreamSource(mediaStream)
      source.connect(a)
      mode = 'spotify'
      bus.emit('audio:connected', { mode: 'spotify' })
    },

    disconnect() {
      cleanupSource()
      mode = null
      bus.emit('audio:disconnected', undefined as void)
    },

    pause() {
      if (!mode || paused) return
      paused = true
      if (audioElement) {
        audioElement.pause()
      } else {
        void ctx?.suspend()
      }
    },

    resume() {
      if (!mode || !paused) return
      paused = false
      if (audioElement) {
        void audioElement.play()
      } else {
        void ctx?.resume()
      }
    },
  }

  return engine
}
