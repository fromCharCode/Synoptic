# CLAUDE.md — Synoptik Projektanweisungen

## Projekt

**Synoptik** ist eine modulare Echtzeit-Musik-Visualisierung-Plattform. Browser-basiert, gebaut mit Vite + TypeScript + Three.js.

## Tech Stack

- **Runtime:** Vite 6, TypeScript (strict mode)
- **3D:** Three.js r170+, drei/examples/jsm für Post-Processing
- **State:** Zustand
- **UI:** Preact + HTM (kein React, kein JSX-Build-Step)
- **Audio:** Web Audio API + AudioWorklet
- **Build:** `pnpm` als Package Manager

## Architektur-Regeln

### Code-Style
- TypeScript strict — kein `any`, kein `as unknown as X`
- Composition over Inheritance — Interfaces, keine abstrakten Klassen
- Functional Core, Imperative Shell — pure Logik in Modulen, Side Effects an den Rändern
- Named Exports — kein `export default`
- Barrel Exports via `index.ts` pro Verzeichnis

### Performance-kritisch
- **Kein GC-Druck im Render Loop:** Keine Object-Allocations in `animate()`. Alle temporären Vektoren/Farben als Module-Level-Variablen vorab anlegen.
- **TypedArrays** für Audio-Daten, nie reguläre Arrays
- **Conditional Rendering:** Post-FX Passes skippen wenn Amount ≈ 0
- **Throttled Rebuilds:** Geometry-Neuerstellung max 15fps, Vertex-Morphing für Audio-Displacement bei voller Framerate
- **InstancedMesh** für Multi-Instance statt separate Mesh-Objekte
- **requestIdleCallback** für nicht-kritische Operationen (Preset-Save, UI-Updates)

### Signal-Konvention
Alle Signale (Audio-Bänder, LFOs, Envelopes, MIDI-CCs) sind auf **0 bis 1** normalisiert. Das Mapping auf tatsächliche Parameter-Ranges passiert ausschließlich in der Patchbay via `amount * (max - min)`. Bipolar-Modulation: amount -1..+1.

### Modul-Struktur
Jedes Modul exportiert:
- Sein Interface/Typen
- Eine Factory-Funktion oder Klasse
- Ist eigenständig testbar ohne DOM oder Three.js Context

## Verzeichnis-Struktur

```
src/
  core/       — Types, Event Bus, Clock, Plugin Registry
  input/      — Audio, MIDI, Gamepad, Webcam
  modular/    — Patchbay, LFOs, Envelopes, Sequencer, Noise, Math
  visualizers/ — Parametric Surfaces, Particles, Shader
  scene/      — SceneManager, Instances, Trails, Camera, Lighting, Materials
  postfx/     — EffectComposer Chain, individual Passes
  ui/         — Panel, Node Graph, Presets, Meters, Controls
  state/      — Zustand Store, Presets, URL-State, Undo/Redo
  utils/      — Math, Color, Geometry, Performance, Export
```

## Befehle

```bash
pnpm install          # Dependencies installieren
pnpm dev              # Dev Server starten (localhost:5173)
pnpm build            # Production Build
pnpm test             # Vitest
pnpm lint             # ESLint
```

## Wichtige Dateien

- `src/core/types.ts` — Alle zentralen Interfaces (Signal, Patch, Preset, Visualizer, Modulator)
- `src/modular/Patchbay.ts` — Herz des Systems: Routing-Matrix Source → Amount → Destination
- `src/input/AudioEngine.ts` — Audio-Analyse mit 8 Bändern + 9 Analyse-Outputs
- `src/state/store.ts` — Zentraler Zustand, Quelle der Wahrheit

## Konventionen

- **Deutsche UI-Labels**, englischer Code/Kommentare
- **Preset-Format ist versioniert** (aktuell v2), Migrations bei Breaking Changes
- **Alle Parameter haben IDs** die stabil bleiben (für Presets)
- **Event Bus** für lose Kopplung zwischen Modulen (z.B. `beat:detected`, `preset:loaded`)
- **Keine direkte DOM-Manipulation** außerhalb von `ui/` — Three.js Renderer verwaltet sich selbst
- **GPU Budget:** 16.6ms pro Frame. Audio-Analyse < 0.5ms, Modulatoren < 0.2ms, Render < 8ms, Post-FX < 3ms

## Aktueller Stand

Prototyp existiert als Single-File HTML (klein-bottle-v4.html) mit:
- 9 parametrische Flächen mit Smoothstep-Morphing
- 30+ patchbare Destinations (inkl. Farb-HSL, Fresnel, Post-FX)
- 4 LFOs, 2 Envelope Follower
- 8-Band FFT + 9 Spectral-Analyse-Outputs
- Tab Audio Capture, Mic, File
- Post-Processing (Bloom, ChromAb, Grain, Vignette)
- Preset System mit 5 Factory Presets
- Spectrum Ring 2D Overlay

Nächste Schritte: Migration in diese Projektstruktur, dann MIDI, Multi-Instance, Node Graph Editor.
