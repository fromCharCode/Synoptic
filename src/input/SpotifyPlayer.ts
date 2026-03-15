/// <reference types="vite/client" />
import type { AudioEngine } from './AudioEngine'
import type { Bus } from '@core/bus'

export interface SpotifyPlayer {
  readonly isConnected: boolean
  readonly trackName: string | null
  readonly artistName: string | null
  connect(): void
  disconnect(): void
  handleCallback(): Promise<boolean>
}

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
// Spotify requires http:// for localhost (https://localhost is rejected as "insecure")
// Register http://localhost:5173/callback in Spotify Dashboard
const REDIRECT_URI = 'http://localhost:5173/callback'
const SCOPES = 'streaming user-read-playback-state user-modify-playback-state'

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, v => chars[v % chars.length]).join('')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createSpotifyPlayer(audioEngine: AudioEngine, bus: Bus): SpotifyPlayer {
  let connected = false
  let trackName: string | null = null
  let artistName: string | null = null
  let accessToken: string | null = null
  let refreshTimer: number | null = null
  let sdkPlayer: unknown = null

  const player: SpotifyPlayer = {
    get isConnected() { return connected },
    get trackName() { return trackName },
    get artistName() { return artistName },

    async connect() {
      const verifier = generateRandomString(128)
      sessionStorage.setItem('spotify_code_verifier', verifier)
      const challenge = await generateCodeChallenge(verifier)

      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      })

      window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
    },

    async handleCallback(): Promise<boolean> {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const verifier = sessionStorage.getItem('spotify_code_verifier')

      if (!code || !verifier) return false

      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: verifier,
          }),
        })

        if (!response.ok) {
          bus.emit('error', { source: 'spotify', message: 'Token-Exchange fehlgeschlagen' })
          return false
        }

        const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number }
        accessToken = data.access_token
        sessionStorage.setItem('spotify_refresh_token', data.refresh_token)
        sessionStorage.removeItem('spotify_code_verifier')

        // Schedule token refresh
        refreshTimer = window.setTimeout(() => refreshToken(), (data.expires_in - 60) * 1000)

        // Clear URL and init SDK
        window.history.replaceState({}, '', '/')
        await initSDK()
        return true
      } catch {
        bus.emit('error', { source: 'spotify', message: 'Spotify Auth fehlgeschlagen' })
        return false
      }
    },

    disconnect() {
      if (sdkPlayer && typeof (sdkPlayer as { disconnect: () => void }).disconnect === 'function') {
        (sdkPlayer as { disconnect: () => void }).disconnect()
      }
      sdkPlayer = null
      connected = false
      trackName = null
      artistName = null
      accessToken = null
      if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null }
      sessionStorage.removeItem('spotify_refresh_token')
      audioEngine.disconnect()
    },
  }

  async function refreshToken() {
    const refreshTokenStr = sessionStorage.getItem('spotify_refresh_token')
    if (!refreshTokenStr) return

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: refreshTokenStr,
        }),
      })

      if (response.ok) {
        const data = await response.json() as { access_token: string; expires_in: number; refresh_token?: string }
        accessToken = data.access_token
        if (data.refresh_token) sessionStorage.setItem('spotify_refresh_token', data.refresh_token)
        refreshTimer = window.setTimeout(() => refreshToken(), (data.expires_in - 60) * 1000)
      }
    } catch {
      bus.emit('error', { source: 'spotify', message: 'Token-Refresh fehlgeschlagen' })
    }
  }

  async function initSDK() {
    // Load Spotify SDK script
    await new Promise<void>((resolve, reject) => {
      if (document.getElementById('spotify-sdk')) { resolve(); return }
      const script = document.createElement('script')
      script.id = 'spotify-sdk'
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.onerror = () => { reject(new Error('SDK load failed')) }
      const head = document.head ?? document.documentElement
      head.appendChild(script)

      // SDK calls this global when ready
      const win = window as unknown as Record<string, unknown>
      win.onSpotifyWebPlaybackSDKReady = () => resolve()
    })

    // Create player - using dynamic access since SDK types aren't available at compile time
    const Spotify = (window as unknown as Record<string, unknown>).Spotify as {
      Player: new (config: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume: number
      }) => {
        connect: () => Promise<boolean>
        disconnect: () => void
        addListener: (event: string, cb: (data: Record<string, unknown>) => void) => void
      }
    }

    const p = new Spotify.Player({
      name: 'Synoptik',
      getOAuthToken: (cb) => { if (accessToken) cb(accessToken) },
      volume: 0.5,
    })

    p.addListener('ready', (data) => {
      const deviceId = data.device_id as string
      // Transfer playback to this device
      fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [deviceId], play: true }),
      }).catch(() => { /* ignore transfer errors */ })

      connected = true

      // Try to capture audio from SDK's audio element
      setTimeout(() => {
        const audioEl = document.querySelector('audio')
        const audioElWithCapture = audioEl as (HTMLAudioElement & { captureStream: () => MediaStream }) | null
        if (audioElWithCapture && typeof audioElWithCapture.captureStream === 'function') {
          const capturedStream = audioElWithCapture.captureStream()
          audioEngine.connectSpotify(capturedStream)
        }
      }, 1000)
    })

    p.addListener('player_state_changed', (state) => {
      if (state) {
        const track = (state as Record<string, unknown>).track_window as Record<string, unknown> | undefined
        const current = track?.current_track as Record<string, unknown> | undefined
        if (current) {
          trackName = current.name as string
          const artists = current.artists as Array<{ name: string }> | undefined
          artistName = artists?.map(a => a.name).join(', ') ?? null
        }
      }
    })

    await p.connect()
    sdkPlayer = p
  }

  return player
}
