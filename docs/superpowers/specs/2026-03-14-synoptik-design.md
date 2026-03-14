# Synoptik — Design Spec

**Date:** 2026-03-14
**Status:** Approved
**Approach:** Clean-Room Build (Ansatz 2)

---

## 1. Projektstruktur & Build

```
synoptik/
├── index.html                    # Vite Entry — Canvas + Panel-Shell
├── vite.config.ts                # HTTPS (für Spotify), Three.js Optimierung
├── tsconfig.json                 # strict, ESM, path aliases
├── package.json                  # pnpm
├── .env                          # VITE_SPOTIFY_CLIENT_ID
│
├── src/
│   ├── main.ts                   # Bootstrap: init Audio, Scene, UI, Render Loop
│   ├── app.ts                    # Orchestration: update() Reihenfolge, dt-Berechnung
│   │
│   ├── core/
│   │   ├── types.ts              # Signal, Patch, Preset, Visualizer, Modulator
│   │   ├── bus.ts                # Typed EventEmitter (beat:detected, preset:loaded, etc.)
│   │   ├── clock.ts              # Frame-Timing, dt, elapsed, frameCount
│   │   └── registry.ts           # Plugin-Registry für Visualizer, Sources, Modulatoren
│   │
│   ├── input/
│   │   ├── AudioEngine.ts        # AudioContext-Management, Source-Switching
│   │   ├── AudioAnalyser.ts      # 8-Band FFT, 13 Analyse-Outputs, Beat Detection
│   │   ├── SpotifyPlayer.ts      # PKCE Auth, Web Playback SDK, Stream → AudioEngine
│   │   └── index.ts
│   │
│   ├── modular/
│   │   ├── Patchbay.ts           # Routing-Matrix: Source → Amount → Destination
│   │   ├── LFO.ts                # sin/tri/saw/sqr/s&h, rate, depth, phase, retrigger
│   │   ├── EnvelopeFollower.ts   # Attack/Release auf beliebige Source
│   │   ├── Macros.ts             # 4 Macro Knobs mit Multi-Destination Bindings
│   │   └── index.ts
│   │
│   ├── visualizers/
│   │   ├── ParametricSurface.ts  # 9 Topologien, GPU Vertex-Shader
│   │   ├── surfaces.ts           # Topologie-Funktionen (Klein, Fig8, Boys, etc.)
│   │   ├── ParticleField.ts      # GPU Instanced, bis 500k Partikel
│   │   ├── Tunnel.ts             # Instanced Rings, Kamera fährt durch
│   │   ├── Terrain.ts            # Noise + Audio Heightmap
│   │   ├── Fractal3D.ts          # Mandelbulb/Menger Raymarching
│   │   ├── WireGlobe.ts          # Wireframe Kugel mit Displacement
│   │   ├── Waveform.ts           # Oszilloskop-Linie, stylized
│   │   ├── SpectrumBars.ts       # Linear/Radial/Mirror Layouts
│   │   ├── ShaderArt.ts          # Voronoi/Plasma/Fractal Flames
│   │   ├── Lissajous.ts          # XY-Scope mit Trail
│   │   ├── CircularWaveform.ts   # Waveform als Polarkoordinaten
│   │   ├── FluidSim.ts           # GPGPU Navier-Stokes
│   │   └── index.ts
│   │
│   ├── scene/
│   │   ├── SceneManager.ts       # Scene, Camera, Lights, Fog, Renderer
│   │   ├── MaterialFactory.ts    # 8 Styles, HSL-Modulation
│   │   ├── FresnelMaterial.ts    # Custom Fresnel-Shader
│   │   └── index.ts
│   │
│   ├── postfx/
│   │   ├── FXChain.ts            # Pass-Pipeline mit Ping-Pong RTs
│   │   ├── passes/
│   │   │   ├── BloomPass.ts
│   │   │   ├── ChromaticAbPass.ts
│   │   │   ├── GrainPass.ts
│   │   │   ├── VignettePass.ts
│   │   │   ├── GlitchPass.ts
│   │   │   ├── PixelSortPass.ts
│   │   │   ├── DatamoshPass.ts
│   │   │   ├── BitCrushPass.ts
│   │   │   ├── FeedbackPass.ts
│   │   │   ├── MotionBlurPass.ts
│   │   │   ├── EchoPass.ts
│   │   │   ├── DOFPass.ts
│   │   │   ├── LensDistortPass.ts
│   │   │   ├── AnamorphicPass.ts
│   │   │   ├── KaleidoscopePass.ts
│   │   │   ├── MirrorPass.ts
│   │   │   ├── ColorGradePass.ts
│   │   │   ├── InvertPass.ts
│   │   │   ├── DuotonePass.ts
│   │   │   ├── HueRotatePass.ts
│   │   │   ├── MonochromePass.ts
│   │   │   ├── HalftonePass.ts
│   │   │   ├── EdgeDetectPass.ts
│   │   │   ├── ASCIIPass.ts
│   │   │   └── CRTPass.ts
│   │   └── index.ts
│   │
│   ├── ui/
│   │   ├── Panel.ts              # Tab-System, Open/Close
│   │   ├── VizTab.ts             # Visualizer-Auswahl Grid
│   │   ├── ShapeTab.ts           # Dynamisch aus Visualizer-Params
│   │   ├── PatchTab.ts           # Modulationsmatrix + Macros
│   │   ├── LFOTab.ts             # LFO-Cards + Envelope-Cards
│   │   ├── AudioTab.ts           # Mic/Tab/File/Spotify, Meter
│   │   ├── FXTab.ts              # Aufklappbare Pass-Sektionen
│   │   ├── SpectrumRing.ts       # 2D Canvas Overlay
│   │   ├── controls.ts           # Slider, Toggle, Select, Button, Knob
│   │   └── index.ts
│   │
│   ├── state/
│   │   ├── store.ts              # Zustand Store
│   │   ├── presets.ts            # Serialize/Deserialize, Factory, localStorage
│   │   └── index.ts
│   │
│   └── utils/
│       ├── math.ts               # lerp, clamp, smoothstep, mapRange
│       └── color.ts              # HSL-Helpers
│
└── klein-bottle-v4.html          # Original-Prototyp (Referenz)
```

### Build-Konfiguration

- **Vite 6** mit HTTPS (erforderlich für Spotify SDK)
- **TypeScript strict** — kein `any`, kein `as unknown as X`
- **pnpm** als Package Manager
- **Path Aliases:** `@core/`, `@input/`, `@modular/`, `@visualizers/`, `@scene/`, `@postfx/`, `@ui/`, `@state/`, `@utils/`
- **Spotify Client-ID:** `e146e822fbd742ab8e5ad1f34fe7ea07` via `.env`
- **Redirect URI:** `https://localhost:5173/callback`

### Dependencies

```
three (r170+)
zustand
preact
htm
lz-string              # URL-State Kompression
@spotify/web-playback-sdk (types)
vite
typescript
vitest
@vitejs/plugin-basic-ssl
```

---

## 2. Core Layer

### Signal System

Alle Werte im System sind **0–1 normalisiert**. Mapping auf echte Ranges passiert ausschließlich in der Patchbay.

```typescript
interface Signal {
  id: string
  label: string
  value: number        // 0–1
  group: string        // 'bands', 'analysis', 'extended', 'lfo', 'envelope', 'macro'
}

interface Patch {
  sourceId: string
  destId: string
  amount: number       // -1..+1 (bipolar)
  curve: 'linear' | 'exp' | 'log' | 'step'
  lag: number          // 0–1 slew rate
}

interface Destination {
  id: string
  label: string
  group: string
  defaultSource: string
  defaultAmount: number
  min: number
  max: number
  colorIndex: number
}

interface StylePreset {
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
```

### Event Bus

```typescript
interface BusEvents {
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
```

Implementierung: `Map<string, Set<callback>>`, keine externe Lib.

### Clock

```typescript
// Exportiert:
clock.dt        // Delta-Time in Sekunden (capped ~0.05)
clock.elapsed   // Gesamtzeit
clock.frame     // Frame-Counter
clock.update()  // einmal pro Frame
```

### Registry

```typescript
registry.registerVisualizer(id, factory)
registry.registerSource(id, signalProvider)
registry.getVisualizer(id) → Visualizer
registry.getVisualizerList() → { id, name, category, description }[]
registry.getSources() → Signal[]
```

---

## 3. Input Layer

### AudioEngine

Verwaltet AudioContext und aktive Quelle. Nur eine Quelle gleichzeitig.

```typescript
audioEngine.context        // AudioContext
audioEngine.analyserNode   // AnalyserNode
audioEngine.mode           // 'mic' | 'tab' | 'file' | 'spotify' | null
audioEngine.isActive       // boolean

audioEngine.connectMic()
audioEngine.connectTabCapture()
audioEngine.connectFile(file: File)
audioEngine.connectSpotify(stream: MediaStream)
audioEngine.disconnect()
```

- Kein Analyse-Code — liefert nur den AnalyserNode
- Feuert `audio:connected` / `audio:disconnected` auf dem Bus
- Tab Capture: Video-Tracks sofort stoppen, nur Audio nutzen
- File: Audio-Element mit Loop, MediaElementSource → Analyser → Destination
- Spotify: MediaStream → MediaStreamSource → Analyser → Destination

### AudioAnalyser

Module-Level TypedArrays (kein GC):
- `frequencyData: Uint8Array`
- `timeDomainData: Uint8Array`
- `previousSpectrum: Float32Array`
- `energyHistory: Float32Array` (Ring-Buffer)

**8 Frequenzbänder (0–1):**

| ID | Label | Range |
|----|-------|-------|
| sub | Sub | 20–60 Hz |
| bass | Bass | 60–250 Hz |
| lowmid | LM | 250–500 Hz |
| mid | Mid | 500–2000 Hz |
| himid | HM | 2000–4000 Hz |
| high | High | 4000–8000 Hz |
| presence | Pres | 8000–14000 Hz |
| air | Air | 14000–20000 Hz |

**13 Analyse-Outputs (0–1):**

| ID | Beschreibung |
|----|-------------|
| energy | Gesamt-Energieniveau |
| peak | Maximum über alle Bänder |
| rms | Root Mean Square der Waveform |
| centroid | Spektraler Schwerpunkt |
| flux | Spektrale Veränderungsrate |
| spread | Spektrale Streuung |
| zcr | Zero Crossing Rate |
| crest | Crest-Faktor (Peak/RMS) |
| beat | Beat-Pulse (decayed) |
| onset | Transient-Detection (50ms Cooldown) |
| rolloff | Spectral Rolloff (85% Energie-Grenze) |
| loudness | LUFS-Approximation (gewichtetes Multi-Frame RMS) |
| bassRatio | bass / (bass + high) |

### SpotifyPlayer

PKCE Auth Flow (kein Client Secret im Browser):

1. User klickt "Connect Spotify"
2. Code-Verifier generieren → sessionStorage
3. Redirect zu Spotify Auth (Scopes: `streaming`, `user-read-playback-state`)
4. Callback: `https://localhost:5173/callback`
5. Code → Token Exchange mit code_verifier
6. Token in sessionStorage, Auto-Refresh vor Ablauf

Playback SDK:
1. Spotify SDK Script dynamisch laden
2. `new Spotify.Player({ getOAuthToken })` → connect
3. `player.on('ready')` → Transfer Playback
4. Audio-Routing: Das SDK nutzt intern ein `<audio>` Element. Da dieses nicht direkt
   zugänglich ist, verwenden wir **Tab Audio Capture** als Fallback-Strategie:
   - Primär: SDK Audio-Element im DOM lokalisieren via `document.querySelector('audio')`
     → `captureStream()` → MediaStream → `audioEngine.connectSpotify(stream)`
   - Fallback: Falls Audio-Element nicht auffindbar, User auffordern
     Tab-Audio-Capture zu nutzen (getDisplayMedia auf den eigenen Tab).
     Spotify SDK liefert Playback, Tab Capture liefert den Audio-Stream für FFT.
   - In beiden Fällen: Audio geht an Lautsprecher UND AnalyserNode

```typescript
spotifyPlayer.isConnected    // boolean
spotifyPlayer.trackName      // string | null
spotifyPlayer.artistName     // string | null
spotifyPlayer.connect()      // startet Auth-Flow
spotifyPlayer.disconnect()
```

Callback-Handling: `main.ts` prüft beim Start ob URL den Spotify-Callback enthält. Falls ja: Token-Exchange, dann redirect auf `/`.

---

## 4. Modular Layer

### Patchbay

Routing-Matrix: Source → Curve → Amount → Lag → Destination.
Patch-Interface definiert in `core/types.ts` (siehe Sektion 2).

```typescript
// Patchbay API:
patchbay.update(signals: Map<string, number>)  // pro Frame
patchbay.get(destId: string): number           // modulierter Wert
patchbay.setPatch(destId, sourceId, amount, curve, lag)
patchbay.clearPatch(destId)
patchbay.registerDestinations(dests: Destination[])    // bei Visualizer-Wechsel
patchbay.unregisterDestinations(ids: string[])         // alte Viz-Destinations entfernen
// Patches auf entfernte Destinations werden automatisch auf source='none' gesetzt.
```

**Curve-Anwendung auf Source-Wert (vor Amount):**
- `linear`: `v` (passthrough)
- `exp`: `v * v` (sanfter Einstieg)
- `log`: `sqrt(v)` (schneller Einstieg)
- `step`: `floor(v * 4) / 4` (5-Stufen Quantisierung)

**Lag/Slew:**
```
laggedValue += (targetValue - laggedValue) * (1 - lag) * dt * 60
```
Vorallokierter Float64Array mit vorherigem Wert pro Destination.

**38+ Shared Destinations:**

| Gruppe | IDs |
|--------|-----|
| Transform | scale, rotX, rotY, rotZ |
| Geometry | dB, dM, dH, sU, sV, topo, morphSpeed |
| Color | hue, sat, brt, eHue, eI, fStr, fHue, bgHue |
| Material | met, rou, opa, wireOpa |
| Scene | fog, cDist, cShk, exp, pSz, pSpd, clS, riO, camFov |
| Lighting | keyInt, fillInt, rimInt, keyHue, fillHue, rimHue |
| Post-FX | alle FXPass-Params (bloom.intensity, glitch.amount, etc.) |

Plus visualizer-spezifische Destinations die beim Wechsel registriert/deregistriert werden.

**Source-Gruppen:**

| Gruppe | IDs |
|--------|-----|
| Off | none |
| Bands | sub, bass, lowmid, mid, himid, high, presence, air |
| Analysis | energy, peak, rms, centroid, flux, spread, zcr, crest, beat |
| Extended | onset, rolloff, loudness, bassRatio |
| LFOs | lfo1, lfo2, lfo3, lfo4 |
| Envelopes | env1, env2, env3, env4 |
| Macros | macro1, macro2, macro3, macro4 |

### LFOs (4 Stück)

```typescript
type Waveform = 'sin' | 'tri' | 'saw' | 'sqr' | 's&h'

interface LFOConfig {
  rate: number              // Hz
  waveform: Waveform
  depth: number             // 0–1
  phaseOffset: number       // 0–1 (0.25 = 90°)
  retriggerOnBeat: boolean  // Phase → 0 bei beat:detected
}
```

Composition over Inheritance: `createLFO(id, config) → LFO` (Factory-Funktion, kein class).

Defaults:
- LFO 1: 0.5 Hz, sin
- LFO 2: 0.2 Hz, tri
- LFO 3: 1.0 Hz, saw
- LFO 4: 2.0 Hz, sqr

### Envelope Follower (4 Stück)

```typescript
createEnvelope(id, sourceId, attack, release) → Envelope

envelope.update(dt, inputValue)
envelope.value → 0–1
```

Defaults:
- ENV 1: bass, atk 10ms, rel 300ms
- ENV 2: high, atk 5ms, rel 150ms
- ENV 3: energy, atk 20ms, rel 500ms
- ENV 4: mid, atk 8ms, rel 200ms

### Macro Knobs (4 Stück)

```typescript
interface MacroBinding {
  destId: string
  amount: number    // -1..+1
}

interface Macro {
  id: string        // macro1–macro4
  label: string
  value: number     // 0–1 (UI-Knob)
  bindings: MacroBinding[]  // bis 16 Destinations
}
```

Macros sind **nur** Sources in der Patchbay (wie LFOs/Envelopes). Sie erscheinen als `macro1`–`macro4` in der Source-Dropdown-Liste. Der Macro-Wert (0–1 vom UI-Knob) wird wie jeder andere Source-Wert durch die Patchbay geroutet (Curve → Amount → Lag → Destination).

Die Macro-Bindings sind ein UI-Shortcut: statt 8 einzelne Patches manuell zu setzen, bindet man einen Macro-Knob an mehrere Destinations gleichzeitig. Intern erzeugt jedes Binding einen normalen Patchbay-Eintrag mit `sourceId: macro.id`.

### Update-Reihenfolge pro Frame

```
 1. clock.update()
 2. audioAnalyser.update(gain, smoothing)
 3. lfos.forEach(update(dt))
 4. envelopes.forEach(update(dt, sourceValue))
 5. patchbay.update(allSignals)  — inkl. Curve + Lag
 6. visualizer.update(dt, patchbay)
 7. postfx.update(patchbay)
 8. renderer.render()
 9. spectrumRing.draw() (throttled, jedes 2. Frame)
10. ui.update() (throttled, jedes 4. Frame)
```

---

## 5. Visualizer & Scene Layer

### Visualizer Plugin Interface

```typescript
interface Visualizer {
  id: string
  name: string
  category: 'surface' | '3d' | '2d'
  description: string
  params: VisualizerParam[]
  toggles: VisualizerToggle[]

  init(context: VisualizerContext): void
  update(dt: number, patchbay: Patchbay): void
  resize(width: number, height: number): void
  dispose(): void
  setOpacity(opacity: number): void
}

interface VisualizerParam {
  id: string
  label: string
  type: 'slider' | 'select' | 'toggle'
  min?: number
  max?: number
  default: number
  options?: { value: number; label: string }[]
  group: string
}

interface VisualizerToggle {
  id: string
  label: string
  default: boolean
}

interface VisualizerContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  canvas2d?: CanvasRenderingContext2D
  width: number
  height: number
}
```

### Visualizer Switching

1. Neuen Visualizer `init()`
2. 0.5s Crossfade (alter opacity 1→0, neuer 0→1)
3. Alten `dispose()`
4. Patchbay-Destinations aktualisieren
5. Form-Tab UI rebuild
6. `bus.emit('visualizer:changed', newId)`

### Visualizer Catalogue

**SURFACES:**

| Visualizer | Params | Toggles | Spezifische Destinations |
|-----------|--------|---------|-------------------------|
| Parametric Surface | topology, segU, segV, scale, rotation | wireframe, autoRotation, pulsation, particles, clipPlane, innerSide, fresnelGlow, spectrumRing | dB, dM, dH, sU, sV, topo, morphSpeed, hue, sat, brt, eHue, eI, fStr, fHue, bgHue, met, rou, opa, wireOpa |

**3D SCENES:**

| Visualizer | Params | Toggles | Spezifische Destinations |
|-----------|--------|---------|-------------------------|
| Particle Field | count (1k–500k), size, speed, spread, gravity, turbulence | trails, colorByVelocity, audioForces | pSize, pSpeed, pSpread, pGravity, pTurbulence, pHue, pSat, pBrt, pForceX, pForceY, pForceZ |
| Tunnel | radius, ringCount, ringSegments, speed, twist | wireframe, glow, colorRings | tRadius, tSpeed, tTwist, tHue, tPulse, tRingGap |
| Terrain | resolution, heightScale, scrollSpeed, noiseScale | wireframe, fog, waterPlane | terrHeight, terrSpeed, terrHue, terrFog, terrNoise |
| Fractal 3D | iterations, power, bailout, epsilon | animate, colorByIteration, orbitTrap | fPower, fBailout, fHue, fGlow, fSlice |
| Wire Globe | radius, wireCount, wireSegments, displacement | rotate, glow, innerSphere | wgRadius, wgDisp, wgHue, wgGlow, wgRotSpeed |

**2D FULLSCREEN:**

| Visualizer | Params | Toggles | Spezifische Destinations |
|-----------|--------|---------|-------------------------|
| Waveform | lineWidth, layers, smoothing, mirrorY | glow, fill, gradient, mirror | wfWidth, wfGlow, wfHue, wfAmplitude, wfScroll |
| Spectrum Bars | barCount, barWidth, gap, layout | rounded, reflection, colorPerBar | sbHeight, sbWidth, sbHue, sbGap, sbRadius |
| Shader Art | pattern, speed, complexity, zoom | audioReactive, colorCycle | saSpeed, saComplexity, saZoom, saHue, saDistort |
| Lissajous | freqX, freqY, phase, trailLength, lineWidth | glow, fade, multiColor | ljFreqX, ljFreqY, ljPhase, ljGlow, ljHue |
| Circular Waveform | radius, lineWidth, layers, rotationSpeed | fill, mirror, glow | cwRadius, cwWidth, cwHue, cwAmplitude, cwRotation |
| Fluid Sim | viscosity, diffusion, forceRadius, colorDecay | audioInject, mouseInject, rainbow | flViscosity, flForce, flHue, flDecay, flSpeed |

### SceneManager

- THREE.Scene mit FogExp2
- PerspectiveCamera (FOV 50, modulierbar via camFov)
- WebGLRenderer (ACES Tonemapping, sRGB, localClipping)
- CubeCamera für Environment-Map Reflections

**Lighting Rig (modulierbar):**

| Licht | Typ | Default | Destinations |
|-------|-----|---------|-------------|
| Ambient | AmbientLight | 0x1a1a2e, 0.5 | — |
| Key | DirectionalLight | warm, 0.9 | keyInt, keyHue |
| Fill | DirectionalLight | cool, 0.35 | fillInt, fillHue |
| Rim | PointLight | blau, 0.5 | rimInt, rimHue |
| Warm | PointLight | orange, 0.3 | — |
| Beat | PointLight | 0, flash | — (auto via beat:detected) |

**Camera pro Frame:**
- Mouse-Tracking (smooth follow)
- Distance-Modulation (cDist)
- Shake-Modulation (cShk)
- FOV-Modulation (camFov, default 50, range ±30)
- `lookAt(0,0,0)`

### MaterialFactory

8 Style-Presets: glass, obsid, holo, neon, xray, copper, vapor, wire.

HSL-Modulation pro Frame:
- `hue += modValue.hue` (wrapping 0–1)
- `saturation += modValue.sat` (clamped)
- `brightness += modValue.brt` (clamped)
- Emissive: eigener Hue-Shift + Intensity
- Wireframe Opacity: smooth 0–1 (nicht mehr nur on/off)
- Background Hue: `scene.background` + `scene.fog.color` synced

### FresnelMaterial

Custom ShaderMaterial: `pow(1 - abs(dot(N, V)), 3) * strength`
Additive Blending, transparent, DoubleSide, kein depthWrite.
Modulierbar: strength, color hue.

---

## 5b. Performance-Strategie

### GPU-First Prinzip

CPU berechnet nur Modulations-Werte (< 1ms). GPU macht den Rest.

### Geometry: GPU Vertex-Shader

Kein CPU-seitiges Vertex-Pushing. Displacement im Vertex-Shader:

```
CPU liefert pro Frame nur Uniforms (< 30 Floats):
  u_time, u_topology, u_dispBass, u_dispMid, u_dispHigh,
  u_hue, u_saturation, u_emissiveIntensity, u_fresnelStrength, etc.

Vertex-Shader berechnet:
  1. Base-Position aus Topologie-Formel (GLSL)
  2. Normal aus analytischer Ableitung
  3. Displacement entlang Normal
```

Alle 9 Topologie-Funktionen als GLSL portiert. Morph via `mix()` im Shader.

### Custom ShaderMaterial

Ein ShaderMaterial das alles vereint:
- Topologie-Morphing im Vertex-Shader
- Audio-Displacement im Vertex-Shader
- HSL-Farbmodulation im Fragment-Shader
- Fresnel-Glow eingebaut
- Emissive mit eigenem Hue
- Metalness/Roughness Approximation
- Clipping Plane Support

### Particles: GPU Instancing

InstancedBufferGeometry mit Position-Update im Vertex-Shader.
100k+ Partikel = 1 Draw Call.
Variable Dichte über `u_visibleRatio` + discard (kein Buffer-Resize).

### Throttling & Conditional Rendering

**60fps:**
- Uniform-Updates (< 0.1ms)
- Render Call (GPU)
- Post-FX Pass (GPU)

**Throttled:**
- Geometry Rebuild (Segment-Änderung): max 15fps
- Spectrum Ring (Canvas 2D): jedes 2. Frame
- UI DOM Updates: jedes 4. Frame

**Skipped wenn inaktiv:**
- Post-FX Pass (alle Werte ≈ 0)
- Wireframe Mesh (opacity ≈ 0)
- Particles (size ≈ 0)
- Fresnel (strength ≈ 0)
- Inner Mesh (toggle off)
- Clipping (toggle off)

### Zero GC im Render Loop

```typescript
// Module-Level vorallokiert:
const _tempVec3 = new THREE.Vector3()
const _tempColor = new THREE.Color()
const _tempHSL = { h: 0, s: 0, l: 0 }
```

Keine Object-Spreads, kein Array.map, kein `new` in `animate()`.

### Budgets

```
Target: 16.6ms (60fps) auf Mid-Range GPU

CPU:
  Audio Analyse:     0.3ms
  Modulatoren:       0.1ms
  Patchbay:          0.1ms
  Uniform-Updates:   0.1ms

GPU:
  Vertex Shader:     2–4ms  (100k verts)
  Fragment Shader:   2–3ms
  Particles:         1–2ms  (100k instanced)
  Post-FX:           1–2ms  (aktive Passes)

Total:              ~8ms   (Headroom für Spikes)
```

---

## 6. Post-FX Chain

### Plugin-Architektur

```typescript
interface FXPass {
  id: string
  label: string
  enabled: boolean
  order: number
  params: FXParam[]

  init(renderer: WebGLRenderer, width: number, height: number): void
  resize(width: number, height: number): void
  render(
    renderer: WebGLRenderer,
    inputRT: WebGLRenderTarget,
    outputRT: WebGLRenderTarget | null,
    uniforms: { time: number; dt: number }
  ): void
  isActive(): boolean
  dispose(): void
}

interface FXParam {
  id: string          // 'bloom.intensity', 'glitch.amount'
  label: string
  value: number
  min: number
  max: number
  group: string
}
```

**FXChain:**
- Geordnete Liste von FXPass-Instanzen
- Ping-Pong RenderTargets (RT_A, RT_B)
- Automatisches Routing: Pass → RT_A → Pass → RT_B → ... → Screen
- Skipped Passes kosten 0

```typescript
fxChain.addPass(pass)
fxChain.removePass(id)
fxChain.reorderPass(id, newOrder)
fxChain.getParams() → FXParam[]  // für Patchbay-Registration
fxChain.render(renderer, sceneRT)
```

### Alle Passes (25 Stück)

**CORE:**
- `BloomPass` — Brightness extract → Dual Gaussian blur (half-res) → Composite. Params: intensity, threshold, radius
- `ChromaticAbPass` — Radial RGB offset. Params: amount
- `GrainPass` — Temporal blue-noise film grain. Params: amount, speed
- `VignettePass` — Radial darkening. Params: amount, softness

**DISTORTION:**
- `GlitchPass` — Block displacement + RGB split + scanlines. Params: amount, blockSize, rgbSplit. Beat-triggerable.
- `PixelSortPass` — Brightness-basiertes Pixel-Shifting. Params: amount, threshold, direction
- `DatamoshPass` — Frame-Blending mit Block-Artifacts. Params: amount, blockSize. Eigener RT für Previous Frame.
- `BitCrushPass` — Color-Quantisierung + Resolution-Reduction. Params: colorDepth, pixelSize

**FEEDBACK/TIME:**
- `FeedbackPass` — Current + Previous Frame blending. Params: amount, zoom, rotate, hueShift. Ping-Pong RT.
- `MotionBlurPass` — Accumulation Buffer. Params: amount
- `EchoPass` — N Ghost-Frames mit Decay. Params: amount, count (2–8), decay. Ring-Buffer RTs at half-resolution to limit VRAM (~16MB statt 64MB bei 1080p).

**OPTISCH:**
- `DOFPass` — Depth-of-Field mit Bokeh. Params: amount, focalDist, aperture. Liest Depth-Buffer.
- `LensDistortPass` — Barrel/Pincushion. Params: amount (-100..+100)
- `AnamorphicPass` — Horizontale Lichtstreifen. Params: amount, spread
- `KaleidoscopePass` — N-fache Spiegel-Symmetrie. Params: amount, segments (2–12)
- `MirrorPass` — Achsen-Spiegelung. Params: horizontal, vertical, diagonal

**COLOR GRADING:**
- `ColorGradePass` — LUT-basiert (16³ 3D-Texturen). Params: amount, look (neutral/cinematic/cool/vintage/neon/bleach). Looks: stepped.
- `InvertPass` — Color Inversion. Params: amount (blend 0–100)
- `DuotonePass` — Zwei Farben für Shadows/Highlights. Params: amount, shadowHue, highlightHue
- `HueRotatePass` — Globaler Hue-Shift. Params: amount
- `MonochromePass` — Desaturation mit Tint. Params: amount, tintHue

**STILISIERUNG:**
- `HalftonePass` — Rasterpunkte. Params: amount, dotSize, angle
- `EdgeDetectPass` — Sobel Neon-Outlines. Params: amount, thickness, glowColor
- `ASCIIPass` — Font-Atlas Lookup nach Brightness. Params: amount, charSize
- `CRTPass` — Scanlines + Phosphor + Curvature. Params: amount, scanlines, curvature, phosphor

### Default Pipeline-Reihenfolge

```
 1. FeedbackPass
 2. MotionBlurPass
 3. EchoPass
 4. KaleidoscopePass
 5. MirrorPass
 6. DOFPass
 7. LensDistortPass
 8. PixelSortPass
 9. DatamoshPass
10. GlitchPass
11. BitCrushPass
12. BloomPass
13. AnamorphicPass
14. ChromaticAbPass
15. ColorGradePass
16. DuotonePass
17. HueRotatePass
18. InvertPass
19. MonochromePass
20. HalftonePass
21. EdgeDetectPass
22. ASCIIPass
23. CRTPass
24. GrainPass
25. VignettePass
```

### Performance

- Inaktive Passes: 0ms (`isActive()` → false → skip)
- Typisch aktiv: 3–5 gleichzeitig
- RTs lazy allokiert (Feedback, Echo, Datamosh nur bei Aktivierung)
- Bloom/Anamorphic: Blur auf halber Auflösung
- Alle Shader vorcompiliert beim App-Start

### Erweiterbarkeit

Neuen Pass hinzufügen:
1. `postfx/passes/MyPass.ts` erstellen
2. `FXPass` Interface implementieren
3. `fxChain.addPass()` registrieren
4. Params automatisch als Patchbay-Destinations + UI-Slider verfügbar

---

## 7. UI Layer

### Technologie

Preact + HTM (kein JSX, kein Build-Step für UI).

### CSS

1:1 vom Prototyp übernommen:
- Custom Properties: `--bg`, `--ac`, `--a2`–`--a5`, `--mn`, `--dp`, etc.
- Fonts: DM Mono + Fraunces
- Panel: 340px, backdrop-filter blur(30px), slide from right
- Identische Slider/Toggle/Button Styles

CSS in eigene Datei `styles.css` extrahiert.

### Panel Tabs

```
┌────────────────────────────────────────┐
│ Viz │ Form │ Patch │ LFO │ Audio │ FX  │
├────────────────────────────────────────┤
│ Tab-Content (scrollbar)                │
└────────────────────────────────────────┘
```

**Viz-Tab:**
Visualizer-Auswahl als kategorisiertes Grid:
- SURFACES: Parametric Surface
- 3D: Particles, Tunnel, Terrain, Fractal, Globe
- 2D: Waveform, Bars, Shader, Lissajous, Circle, Fluid

Aktiver hervorgehoben. Klick → Crossfade.

**Form-Tab (dynamisch):**
Komplett vom aktiven Visualizer bestimmt. `visualizer.params` → Slider/Select. `visualizer.toggles` → Toggle-Reihen. Kein hardcoded UI pro Visualizer.

**Patch-Tab:**
- Modulationsmatrix: gruppiert, pro Destination: Label | Source-Dropdown | Amount-Slider | Activity-LED
- Pro Patch aufklappbar: Curve-Buttons (lin/exp/log/step) + Lag-Slider
- Macro-Sektion: 4 Canvas-Knobs, Binding-Liste, Add-Destination-Dropdown
- Destinations aktualisieren sich beim Visualizer-Wechsel

**LFO-Tab:**
- 4 LFO-Cards: Waveform-Buttons, Canvas-Preview, Rate, Depth, Phase Offset, Beat Retrigger Toggle
- 4 Envelope-Cards: Source-Dropdown, Attack, Release

**Audio-Tab:**
- Buttons: Mic, Tab, File, Spotify Connect
- Spotify zeigt Track + Artist nach Connect
- 8 Band-Meter + 13 Analyse-Meter (inkl. onset, rolloff, loudness, bassRatio)
- Sensitivity: Gain, Smooth, Beat

**FX-Tab:**
- Aufklappbare Sektionen pro Pass
- Header: Enable-Toggle + Name + Active-LED
- Body: Slider pro Param
- Kategorien als Section-Headers
- Preset-Bereich unten: Random, Save, Reset, Saved List, Factory

### Intro Screen

"Synoptik" in Fraunces italic, Subtitle, Fade-Out nach 2.5s.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| P | Panel toggle |
| W | Wireframe toggle |
| Space | Pause |
| F | Fullscreen |
| M | Mic toggle |
| R | Randomize |
| S | Spotify connect/disconnect |
| 1–9 | Topologie direct |
| Tab | Nächster Panel-Tab |
| Esc | Panel close / Exit Fullscreen |

### Overlays

- Links unten: "Synoptik" Logo-Text
- Rechts unten: Keyboard-Hints
- Spectrum Ring: Canvas Overlay
- Alle: opacity 0 → 1 on mouse, fade nach 3s

---

## 8. State Layer

### Zustand Store

```typescript
interface SynoptikState {
  activeVisualizer: string
  vizParams: Record<string, number>
  vizToggles: Record<string, boolean>
  style: string

  patches: Record<string, {
    source: string
    amount: number
    curve: string
    lag: number
  }>

  lfos: Array<{
    rate: number
    waveform: string
    depth: number
    phaseOffset: number
    retriggerOnBeat: boolean
  }>
  envelopes: Array<{
    source: string
    attack: number
    release: number
  }>
  macros: Array<{
    label: string
    value: number
    bindings: Array<{ destId: string; amount: number }>
  }>

  audioGain: number
  audioSmoothing: number
  beatSensitivity: number

  fxParams: Record<string, number>
  fxEnabled: Record<string, boolean>

  panelOpen: boolean
  activeTab: string
}
```

UI subscribes via Zustand selectors. Render-Loop liest direkt aus Modulen (Performance). Store sync throttled ~15fps.

### Preset System

```typescript
interface SynoptikPreset {
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
```

- Factory Presets: hardcoded, mindestens 1 pro Visualizer
- User Presets: localStorage `synoptik_presets`
- Versioniert mit Migration bei Breaking Changes
- URL-Sharing: JSON → lz-string compress → base64url im Fragment

### Randomize

1. Zufälligen Visualizer wählen
2. Dessen Params randomisieren (sinnvolle Ranges)
3. ~40% Destinations mit zufälligen Sources patchen
4. LFOs randomisieren, Phase Offsets, 30% Beat Retrigger
5. 2–4 FX Passes aktivieren mit zufälligen Werten

---

## 8b. Bootstrap & Orchestration

### main.ts — Bootstrap-Sequenz

```typescript
// 1. Spotify Callback Check
//    Falls URL ?code= enthält: Token-Exchange, redirect auf '/'
//    Falls URL #preset= enthält: Preset merken für Schritt 7

// 2. Core Init
//    bus = createBus()
//    clock = createClock()
//    registry = createRegistry()

// 3. Audio Init
//    audioEngine = createAudioEngine()
//    audioAnalyser = createAudioAnalyser(audioEngine.analyserNode)
//    spotifyPlayer = createSpotifyPlayer(audioEngine)

// 4. Modular Init
//    lfos = [createLFO('lfo1', ...), ...]
//    envelopes = [createEnvelope('env1', ...), ...]
//    macros = [createMacro('macro1'), ...]
//    patchbay = createPatchbay()
//    → Alle Sources registrieren (bands, analysis, lfos, envs, macros)

// 5. Scene Init
//    sceneManager = createSceneManager(canvas)
//    fxChain = createFXChain(sceneManager.renderer)
//    → FX-Params als Patchbay-Destinations registrieren

// 6. Visualizer Init
//    Alle Visualizer in Registry registrieren
//    Default-Visualizer ('parametricSurface') aktivieren

// 7. State Init
//    store = createStore()
//    Falls URL-Preset vorhanden: laden
//    Sonst: Default-State

// 8. UI Init
//    renderUI(store, bus)   ← Preact render() in Panel-Container

// 9. Intro abspielen, nach 2.5s ausblenden

// 10. Render Loop starten
//     requestAnimationFrame(app.animate)
```

### app.ts — Orchestration

```typescript
// createApp() → { animate, destroy }

// animate() wird pro Frame aufgerufen:
function animate() {
  requestAnimationFrame(animate)
  if (paused) { renderer.render(scene, camera); return }

  clock.update()
  const dt = clock.dt

  // 1. Input
  audioAnalyser.update(store.audioGain, store.audioSmoothing)

  // 2. Modulatoren
  for (const lfo of lfos) lfo.update(dt)
  for (const env of envelopes) {
    const input = getSignalValue(env.source)
    env.update(dt, input)
  }

  // 3. Signal-Map aufbauen (vorallokiert, kein new Map)
  collectSignals(signalMap, audioAnalyser, lfos, envelopes, macros)

  // 4. Patchbay
  patchbay.update(signalMap)

  // 5. Visualizer
  activeVisualizer.update(dt, patchbay)

  // 6. Scene (Camera, Lights, Fog)
  sceneManager.update(dt, patchbay)

  // 7. Render + Post-FX
  fxChain.render(renderer, scene, camera)

  // 8. Throttled Updates
  if (clock.frame % 2 === 0) spectrumRing.draw()
  if (clock.frame % 4 === 0) { updateMeters(); drawLFOPreviews() }
}
```

### Error Handling

```typescript
// Alle async-Operationen (Audio, Spotify, File) sind in try/catch.
// Fehler werden über den Bus propagiert:

bus.emit('error', { source: 'audio', message: 'Mikrofon-Zugriff verweigert' })
bus.emit('error', { source: 'spotify', message: 'Auth fehlgeschlagen' })

// UI zeigt Fehler als Toast-Notification:
// - Unterer Bildschirmrand, fade-in/out, 4s sichtbar
// - Kein Alert/Prompt — non-blocking

// Graceful Degradation:
// - Audio-Fehler: App läuft weiter, Visualizer zeigt statischen Default
// - Spotify-Fehler: Fallback auf andere Audio-Sources
// - WebGL-Fehler: Fehlermeldung auf Intro-Screen
```

### Visualizer Crossfade

```typescript
// Beide Visualizer sind während der Transition gleichzeitig in der Scene.
// Ablauf:

// 1. Neuen Visualizer init(context) — unsichtbar (opacity 0)
// 2. 0.5s Animation (per clock.elapsed, nicht setTimeout):
//    - Alter Visualizer: setOpacity(1 → 0) — Material.opacity + Fresnel fade
//    - Neuer Visualizer: setOpacity(0 → 1)
//    - Für 2D-Visualizer: Alpha-Blending auf Canvas
// 3. Nach Transition: alter.dispose(), aus Scene entfernen
// 4. Patchbay-Destinations swappen
// 5. UI-Update (Form-Tab rebuild)

// setOpacity() Implementierung pro Visualizer-Typ:
// - 3D Meshes: material.opacity, Fresnel strength, Particle alpha
// - 2D Shader: globalAlpha oder uniform u_opacity
// - Crossfade-State wird in app.ts verwaltet (kein eigenes Modul)
```

### Shader Compilation

```typescript
// Nicht alle 25 FX-Shaders + Visualizer-Shader synchron beim Start kompilieren.
// Stattdessen: Progressive Compilation.

// Beim App-Start: nur aktive Shader kompilieren
// - Default-Visualizer (ParametricSurface) Shader
// - BloomPass + VignettePass (fast immer aktiv)
// - GrainPass (Default aktiv)

// Restliche Shader: beim ersten Aktivieren kompilieren.
// → Kurzer Jank beim ersten Einschalten eines Passes (einmalig)
// → Alternativ: requestIdleCallback zum Vorkompilieren in Leerlaufzeiten
//    nach dem ersten Frame, 1-2 Shader pro Idle-Callback
```

### Hinweis: morphSpeed Destination

```
morphSpeed steuert die Geschwindigkeit des Smoothstep-Morphings zwischen Topologien.
Default: 1.0 (normales Tempo). Range: 0.1–5.0.
Bei morphSpeed > 1: schnelleres Überblenden, bei < 1: langsames, dramatisches Morphing.
Wird im Vertex-Shader als Multiplikator auf den Morph-Interpolator angewandt.
```

### Hinweis: Band-ID Rename

```
Prototyp nutzt 'pres' als Band-ID (8000–14000 Hz).
Spec nutzt 'presence' für Konsistenz mit den anderen langen IDs.
Migration: Factory-Presets im Code nutzen die neuen IDs.
User-Presets aus localStorage: migratePreset() mapped 'pres' → 'presence'.
```

---

## 9. Scope-Abgrenzung

### In Phase 1 (dieses Spec)

- Core: Bus, Clock, Registry, Types
- Input: AudioEngine, AudioAnalyser, SpotifyPlayer
- Modular: Patchbay (Curves, Lag), 4 LFOs (Phase, Retrigger), 4 Envelopes, 4 Macros
- Visualizer: 12 Stück (1 Surface, 5 3D, 6 2D)
- Scene: Manager, Materials, Fresnel, Lighting Rig
- Post-FX: 25 Passes, Plugin-Architektur
- UI: 6 Tabs, dynamisches Panel, Intro, Shortcuts, Spectrum Ring
- State: Zustand, Presets, URL-Sharing
- Performance: GPU-first, Zero GC, Conditional Rendering

### NICHT in Phase 1

- MIDI / Gamepad / Webcam Input
- Node Graph Editor
- Multi-Instance / Trail System
- LOD System
- AudioWorklet (off-thread)
- Undo/Redo
- Video Export
- Mobile/Touch
- Layer-System (mehrere Visualizer gleichzeitig)
