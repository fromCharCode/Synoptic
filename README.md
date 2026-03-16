# Synoptik

Modulare Echtzeit-Musik-Visualisierung im Browser. Gebaut mit Vite + TypeScript + Three.js.

## Features

- **12 Visualizer** — Parametrische Flächen, Partikel, Tunnel, Terrain, Fraktale, Wireframe-Globe, Waveform, Spectrum Bars, Lissajous, Circular Waveform, Shader Art, Fluid Sim
- **5 Audio-Quellen** — Mikrofon, Tab Capture, Audiodatei, Spotify, YouTube
- **25 Post-FX Passes** — Bloom, Chromatic Aberration, Glitch, Feedback, Kaleidoscope, CRT, ASCII, u.v.m.
- **Modulares Routing** — Patchbay verbindet Audio-Bänder, LFOs, Envelopes und Macros mit 30+ Destinations
- **Preset System** — Factory Presets, URL-Sharing via LZ-String-komprimierte Hashes
- **Keyboard Shortcuts** — `P` Panel, `W` Wireframe, `Space` Pause, `F` Fullscreen, `S` Spotify, `1-9` Topologie

## Quickstart

```bash
pnpm install
cp .env.example .env     # Spotify Client ID eintragen (optional)
pnpm dev                 # http://localhost:5173
```

## Konfiguration

Umgebungsvariablen in `.env` (siehe `.env.example`):

| Variable | Beschreibung | Default |
|---|---|---|
| `VITE_SPOTIFY_CLIENT_ID` | Spotify Web API Client ID ([Dashboard](https://developer.spotify.com/dashboard)) | — |
| `VITE_SPOTIFY_REDIRECT_URI` | OAuth Redirect URI | `{origin}/callback` |

Für Spotify: App im [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) erstellen, Redirect URI auf `http://localhost:5173/callback` setzen, Client ID in `.env` eintragen.

## Befehle

```bash
pnpm install          # Dependencies installieren
pnpm dev              # Dev Server (localhost:5173)
pnpm build            # Production Build
pnpm test             # Vitest
pnpm lint             # TypeScript Type-Check
```

## Architektur

```
src/
  core/         — Types, Event Bus, Clock, Registry
  input/        — AudioEngine, SpotifyPlayer, YouTubePlayer
  modular/      — Patchbay, LFOs, Envelopes, Macros
  visualizers/  — 12 Visualizer-Implementierungen
  scene/        — SceneManager, Materials, Fresnel
  postfx/       — FXChain + 25 Shader Passes
  ui/           — Preact + HTM Panels
  state/        — Zustand Store, Presets
  utils/        — Math, Color Utilities
```

Alle Signale sind auf **0–1** normalisiert. Mapping auf Parameter-Ranges geschieht ausschließlich in der Patchbay.

## Tech Stack

- **Runtime:** Vite 6, TypeScript (strict), Three.js r183
- **UI:** Preact + HTM (kein JSX-Build-Step)
- **State:** Zustand
- **Audio:** Web Audio API (FFT 4096, 8 Bänder + 13 Spectral Features)

## Bekannte Bugs

### Spotify-Integration funktioniert nicht zuverlässig

Spotify Web Playback SDK erfordert **Premium** und ist generell fragil:
- `captureStream()` auf dem SDK-Audio-Element ist nicht in allen Browsern verfügbar (Safari fehlt komplett)
- Die Audio-Element-Erkennung nach SDK-Ready basiert auf einem 1-Sekunden-Timeout (`setTimeout`), was je nach Ladezeit zu früh oder zu spät greifen kann
- Bei schnellem Connect/Disconnect kann der Timeout auf ein bereits zerstörtes Audio-Element zugreifen (Race Condition)
- SDK Event Listener werden bei `disconnect()` nicht explizit entfernt — bei wiederholtem Reconnect akkumulieren sie

### Object-URL Memory Leak bei Audiodatei-Wiedergabe

Wenn eine Audiodatei geladen wird, wird `URL.createObjectURL()` aufgerufen, aber `URL.revokeObjectURL()` wird nie aufgerufen. Bei wiederholtem Laden von Dateien entsteht ein Memory Leak.

### Bus Event Listener werden nicht aufgeräumt

Die in `app.ts` registrierten Bus-Listener (`error`, `audio:connected`, `audio:disconnected`) werden in der `destroy()`-Methode nicht entfernt. Bei App-Neuinitialisierung akkumulieren die Listener.

### Mic/Spotify Audio nicht am Ausgang hörbar

In `connectMic()` und `connectSpotify()` wird der Analyser-Node **nicht** an `context.destination` angeschlossen — im Gegensatz zu `connectTabCapture()` und `connectFile()`. Das bedeutet: Audio-Analyse funktioniert, aber der Sound ist nicht über die Lautsprecher hörbar. (Bei Mic ist das ggf. gewollt um Feedback zu vermeiden, bei Spotify ist es ein Bug.)

### YouTube Promise-Rejection unbehandelt

Wenn das YouTube IFrame API Script nicht laden kann, wird die Promise-Rejection nicht explizit gefangen. Bei parallelen `loadVideo()`-Aufrufen vor API-Load entstehen unbehandelte Rejections.

## Browser-Anforderungen

- Web Audio API, WebGL 2.0
- `getUserMedia` (Mikrofon)
- `getDisplayMedia` (Tab Capture)
- Crypto Subtle API (Spotify PKCE)
- Getestet mit Firefox und Chrome

## Lizenz

Privat — keine Nutzung ohne Genehmigung.
