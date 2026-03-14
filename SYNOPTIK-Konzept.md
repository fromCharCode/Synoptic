# SYNOPTIK — Modular Music Visualizer Platform

## Vision

Eine performante, erweiterbare Plattform für Echtzeit-Musik-Visualisierung. Nicht nur ein Spielzeug, sondern ein ernstes kreatives Werkzeug — ein visuelles Instrument, das genauso ausdrucksstark ist wie ein Synthesizer.

**Kernprinzipien:**
- **Modular** — Jede Komponente ist austauschbar. Neue Visualizer, Modulatoren und Inputs sind Plugins.
- **Performant** — 60fps auf Mid-Range-Hardware mit mehreren Instanzen und Post-FX.
- **Patchbar** — Alles kann alles steuern. Audio → Geometrie → Farbe → Kamera → FX.
- **Speicherbar** — Presets, Scenes, Performance-Sets. Teilbar per URL.

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                        SYNOPTIK                                  │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│  INPUT   │  MODULAR │  RENDER  │  POST-FX │        UI           │
│  LAYER   │  ENGINE  │  ENGINE  │  CHAIN   │      LAYER          │
├──────────┼──────────┼──────────┼──────────┼─────────────────────┤
│ Audio    │ Patchbay │ Scene    │ Bloom    │ Panel System        │
│ - Mic    │ LFOs     │ Graph    │ ChromAb  │ Node Graph Editor   │
│ - Tab    │ Envelopes│ Multi-   │ Grain    │ Preset Manager      │
│ - File   │ Sequencer│ Instance │ Vignette │ Performance View    │
│ MIDI     │ Random   │ Trail    │ Custom   │ Meters / Scopes     │
│ Gamepad  │ Math     │ System   │ Shaders  │ Mobile Touch        │
│ Webcam   │ Noise    │          │          │                     │
│ OSC/WS   │          │          │          │                     │
└──────────┴──────────┴──────────┴──────────┴─────────────────────┘
```

---

## Tech Stack

| Schicht | Technologie | Begründung |
|---------|-------------|------------|
| Build | **Vite 6** | HMR, ESM, schnell, Plugin-Ökosystem |
| Sprache | **TypeScript (strict)** | Type Safety für das komplexe Modular-System |
| 3D | **Three.js r170+** | Bewährt, große Community, gute Abstraktion |
| Post-FX | **three/examples/jsm/postprocessing** | EffectComposer mit Passes statt eigener Shader-Quad |
| State | **Zustand** | Minimal, performant, kein Boilerplate |
| UI-Framework | **Preact + HTM** | React-API, 3kb, kein JSX-Build nötig |
| Node Graph | **Custom Canvas** | Keine externe Lib — volle Kontrolle, kein Overhead |
| Audio | **Web Audio API** | Native, low-latency, AnalyserNode + AudioWorklet |
| MIDI | **Web MIDI API** | Native Browser-API |
| Gamepad | **Gamepad API** | Native Browser-API |
| Persistenz | **localStorage + URL State** | Presets lokal, Sharing per URL |
| Testing | **Vitest** | Schnell, Vite-nativ |

---

## Projektstruktur

```
synoptik/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
│
├── src/
│   ├── main.ts                     # Entry Point, Bootstrap
│   ├── app.ts                      # App-Orchestration, Render Loop
│   │
│   ├── core/
│   │   ├── types.ts                # Zentrale Typen: Signal, Param, Patch, Preset
│   │   ├── bus.ts                  # Event Bus (typed pub/sub)
│   │   ├── clock.ts                # Master Clock, BPM, Frame-Timing
│   │   └── registry.ts            # Plugin Registry (Visualizer, Sources, FX)
│   │
│   ├── input/
│   │   ├── AudioEngine.ts          # Web Audio: Mic, Tab Capture, File, Analyse
│   │   ├── AudioAnalyser.ts        # FFT-Bänder, Spectral Analysis, Beat Detection
│   │   ├── AudioWorkletProcessor.ts # Für RMS/Peak-Detection off-thread
│   │   ├── MidiInput.ts            # Web MIDI: CC-Mapping, Note-Trigger, Learn-Mode
│   │   ├── GamepadInput.ts         # Gamepad: Axis → continuous, Button → gate/trigger
│   │   ├── WebcamInput.ts          # Luma-Analyse, Motion Detection
│   │   └── index.ts                # Re-exports
│   │
│   ├── modular/
│   │   ├── Signal.ts               # Signal-Typ: value, min, max, label
│   │   ├── Patchbay.ts             # Routing-Matrix: Source → Amount → Destination
│   │   ├── LFO.ts                  # LFO: sin/tri/saw/sqr/s&h, sync, phase offset
│   │   ├── EnvelopeFollower.ts     # Attack/Release Envelope
│   │   ├── StepSequencer.ts        # 8/16/32 Steps, per-step value, clock sync
│   │   ├── NoiseGenerator.ts       # Perlin, White, Pink, Brown
│   │   ├── MathNode.ts             # Add, Multiply, Map, Clamp, Lag, Slew
│   │   ├── Modulator.ts            # Base interface für alle Modulatoren
│   │   └── index.ts
│   │
│   ├── visualizers/
│   │   ├── VisualizerBase.ts       # Abstract Base Class
│   │   ├── ParametricSurface.ts    # Klein Bottle, Torus, Boy's, Enneper, etc.
│   │   ├── ParticleField.ts        # GPU-Instanced Particles
│   │   ├── MeshDeformer.ts         # Displacement, Noise, Wave
│   │   ├── ShaderVisualizer.ts     # Custom Fragment Shader Playground
│   │   ├── surfaces/
│   │   │   ├── KleinBottle.ts
│   │   │   ├── BoysSurface.ts
│   │   │   ├── EnneperSurface.ts
│   │   │   ├── DiniSurface.ts
│   │   │   ├── Superformula.ts
│   │   │   ├── GyroidSurface.ts
│   │   │   └── CustomEquation.ts   # User-defined parametric equations
│   │   └── index.ts
│   │
│   ├── scene/
│   │   ├── SceneManager.ts         # Scene Graph, Instancing, Layers
│   │   ├── InstanceManager.ts      # Multi-Instance: Offsets, Delays, Trails
│   │   ├── TrailSystem.ts          # Afterimage/Ghost-Copies mit Fade
│   │   ├── CameraController.ts     # Orbit, Shake, Modulation, Presets
│   │   ├── LightingRig.ts          # Reaktive Lichter, Beat-Flash
│   │   ├── FresnelShader.ts        # Custom Fresnel Glow Material
│   │   └── MaterialFactory.ts      # HSL-modulierbare Materialien
│   │
│   ├── postfx/
│   │   ├── FXChain.ts              # EffectComposer Wrapper
│   │   ├── BloomPass.ts            # UnrealBloom mit patchbarem Threshold
│   │   ├── ChromaticPass.ts        # Chromatic Aberration
│   │   ├── GrainPass.ts            # Film Grain, temporal
│   │   ├── VignettePass.ts
│   │   ├── GlitchPass.ts           # Digitaler Glitch, Beat-triggered
│   │   ├── FeedbackPass.ts         # Video Feedback / Trail-Effekt
│   │   └── index.ts
│   │
│   ├── ui/
│   │   ├── PanelSystem.ts          # Tab-basiertes Panel, Resize, Collapse
│   │   ├── NodeGraphEditor.ts      # Canvas-basierter Patch-Editor
│   │   ├── PresetManager.ts        # Save/Load/Share/Factory/Random
│   │   ├── PerformanceView.ts      # Reduzierte UI für Live-Performance
│   │   ├── MeterDisplay.ts         # Audio-Meter, LFO-Viz, Scopes
│   │   ├── SpectrumRing.ts         # 2D Canvas Spectrum Overlay
│   │   ├── LissajousScope.ts       # Oszilloskop / XY-Scope
│   │   ├── controls/
│   │   │   ├── Knob.ts             # Drehregler (Canvas)
│   │   │   ├── Slider.ts
│   │   │   ├── Toggle.ts
│   │   │   ├── Select.ts
│   │   │   └── ColorPicker.ts
│   │   └── index.ts
│   │
│   ├── state/
│   │   ├── store.ts                # Zustand Store: alle Parameter
│   │   ├── presets.ts              # Preset-Serialisierung/Deserialisierung
│   │   ├── urlState.ts             # URL-Parameter Encoding/Decoding
│   │   └── history.ts              # Undo/Redo Stack
│   │
│   └── utils/
│       ├── math.ts                 # lerp, clamp, smoothstep, mapRange
│       ├── color.ts                # HSL-Manipulation, Palette-Generation
│       ├── geometry.ts             # Parametric Surface Utils, Normal Calc
│       ├── performance.ts          # FPS Counter, Budget Monitor
│       └── export.ts               # MediaRecorder WebM, Screenshot PNG
│
├── public/
│   └── workers/
│       └── audio-worklet.js        # AudioWorklet Processor
│
└── CLAUDE.md                       # Claude Code Anweisungen
```

---

## Kern-Interfaces

### Signal — die universelle Währung

```typescript
interface Signal {
  id: string;
  label: string;
  value: number;      // aktueller Wert, normalisiert 0-1
  min: number;        // Mapping-Range
  max: number;
  group: string;      // für UI-Gruppierung
}
```

### Patch — eine Verbindung

```typescript
interface Patch {
  sourceId: string;   // Signal-ID (Band, LFO, Envelope, MIDI CC, etc.)
  destId: string;     // Parameter-ID
  amount: number;     // -1 bis +1 (bipolar)
  curve: 'linear' | 'exponential' | 'logarithmic' | 'step';
}
```

### Visualizer Plugin Interface

```typescript
interface Visualizer {
  id: string;
  name: string;
  params: VisualizerParam[];    // alle modulierbaren Parameter
  
  init(scene: THREE.Scene): void;
  update(dt: number, signals: Map<string, number>): void;
  rebuild(params: Record<string, number>): void;
  dispose(): void;
  
  getGeometry(): THREE.BufferGeometry;   // für Instancing/Trails
  getMaterial(): THREE.Material;
}
```

### Modulator Plugin Interface

```typescript
interface Modulator {
  id: string;
  type: string;
  outputs: Signal[];    // was dieser Modulator produziert
  
  update(dt: number): void;
  getUI(): UIComponent;   // rendert sich selbst
  serialize(): object;
  deserialize(data: object): void;
}
```

---

## Performance-Strategie

### GPU-Budget pro Frame (16.6ms für 60fps)

| Phase | Budget | Technik |
|-------|--------|---------|
| Audio-Analyse | 0.5ms | AudioWorklet (off-thread) |
| Modulatoren | 0.2ms | TypedArrays, kein GC |
| Geometry-Update | 3ms | Throttled rebuild, vertex morph statt rebuild |
| Render | 8ms | Instancing, LOD, Frustum Culling |
| Post-FX | 3ms | Shader-basiert, conditional passes |
| UI | 1ms | Canvas 2D, throttled DOM updates |

### Optimierungs-Techniken

**Geometry:**
- Vertex-Morphing statt Geometry-Rebuild für Audio-Displacement
- Nur bei Topologie/Segment-Änderungen: full rebuild (throttled, max 15fps)
- SharedArrayBuffer zwischen AudioWorklet und Main Thread

**Rendering:**
- THREE.InstancedMesh für Multi-Instance (1 Draw Call statt N)
- LOD-System: hohe Segments nah, niedrige fern
- Conditional Post-FX Passes (skip wenn Amount ≈ 0)
- Render Target Reuse (kein neues RT pro Frame)

**Audio:**
- AudioWorklet für RMS/Peak/ZCR off-thread
- FFT nur 1x pro Frame, Ergebnisse cachen
- Band-Werte in Float32Array, kein Object-Allocation

**UI:**
- Meter/LFO-Viz: Canvas 2D, throttled auf 15fps
- DOM-Updates nur bei sichtbarem Panel
- Node Graph: eigener Canvas, nur dirty regions repainten
- requestIdleCallback für Preset-Serialisierung

---

## Node-Graph Editor — Konzept

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AUDIO IN   │     │   LFO 1     │     │  KLEIN      │
│             │     │ ┌─────────┐ │     │  BOTTLE     │
│  [sub]  ────┼────▶│ │  rate   │ │     │             │
│  [bass] ────┼──┐  │ └─────────┘ │     │  [hue]  ◀───┼── LFO 1.out
│  [mid]      │  │  │ ┌─────────┐ │     │  [disp] ◀───┼── bass
│  [high]     │  │  │ │  depth  │ │     │  [emis] ◀───┼── energy
│  [energy]───┼──┼──▶│ └─────────┘ │     │             │
│             │  │  │             │     └─────────────┘
└─────────────┘  │  │  [out] ────┼────▶ bloom.amount
                 │  └─────────────┘
                 │
                 │  ┌─────────────┐
                 └─▶│  ENVELOPE   │
                    │  [out] ─────┼────▶ cam.shake
                    └─────────────┘
```

**Interaktion:**
- Klick auf Output-Port → Drag → Drop auf Input-Port = Patch
- Rechtsklick auf Kabel = Amount-Slider inline
- Doppelklick auf Node = Parameter-Edit
- Ctrl+Drag auf Canvas = Pan, Scroll = Zoom
- Minimap unten rechts

**Implementation:**
- Eigenes Canvas-Element über dem 3D-View (togglebar)
- Nodes als Rectangles mit Port-Circles
- Kabel als Bézier-Curves (cubic, mit Amount als Dicke/Farbe)
- Hit-Testing per Spatial Hash
- Serialisierbar als JSON-Graph

---

## Multi-Instance System

```typescript
interface InstanceConfig {
  visualizerId: string;
  count: number;           // 1-64
  layout: 'grid' | 'ring' | 'spiral' | 'random' | 'custom';
  spacing: number;
  
  // Per-Instance Modulation
  offsetParam: string;     // welcher Param wird pro Instance versetzt
  offsetAmount: number;    // wie viel Offset pro Instance
  delayFrames: number;     // zeitlicher Versatz (für Trail-Effekt)
  
  // Shared vs. Independent
  sharedMaterial: boolean; // eine Material-Instanz oder pro Instance
  sharedGeometry: boolean;
}
```

**Trail-System:**
- N Ghost-Copies mit abnehmender Opacity
- Jede Copy ist X Frames verzögert (Ring-Buffer der Transformationen)
- GPU-seitig: InstancedMesh + per-Instance opacity via attribute

---

## MIDI-Integration

```typescript
interface MidiMapping {
  channel: number;          // 0-15
  type: 'cc' | 'note' | 'pitchbend' | 'aftertouch';
  number: number;           // CC-Nummer oder Note-Nummer
  targetSignalId: string;   // wird als Source im Patchbay verfügbar
  
  // Optionen
  range: [number, number];  // Remapping
  curve: 'linear' | 'exponential';
  latch: boolean;           // für Buttons: toggle statt momentary
}
```

**Learn-Mode:**
1. Klick auf "Learn" neben einem Parameter
2. Drehe am MIDI-Knob
3. Mapping wird automatisch erstellt
4. Gespeichert im Preset

---

## Preset-Format

```typescript
interface SynoptikPreset {
  version: 2;
  name: string;
  author?: string;
  created: string;        // ISO date
  
  // Scene
  visualizer: string;     // ID
  style: string;
  topology: number;
  segments: { u: number; v: number };
  
  // Modular
  patches: Patch[];
  lfos: LFOState[];
  envelopes: EnvelopeState[];
  sequencers?: SequencerState[];
  
  // Scene Config
  camera: CameraState;
  lighting: LightingState;
  toggles: Record<string, boolean>;
  
  // FX
  fx: Record<string, number>;
  
  // Instances
  instances?: InstanceConfig;
  
  // MIDI
  midiMappings?: MidiMapping[];
}
```

**Sharing:** Base64-encoded JSON in URL-Fragment: `synoptik.app/#preset=eyJ2ZXJzaW9...`

---

## Roadmap

### Phase 1: Foundation (Architektur)
- [ ] Vite + TypeScript Projekt-Setup
- [ ] Core: Signal, Patchbay, Registry, Bus, Clock
- [ ] AudioEngine portieren (Mic, Tab, File, FFT, Beat)
- [ ] LFO, Envelope portieren
- [ ] ParametricSurface Visualizer (alle 9 Topologien)
- [ ] MaterialFactory mit HSL-Modulation + Fresnel
- [ ] Basic UI Panel (ohne Node Graph)
- [ ] Post-FX Chain (EffectComposer)
- [ ] Preset Save/Load/URL

### Phase 2: Inputs & Modulatoren
- [ ] MIDI Input + Learn Mode
- [ ] Gamepad Input
- [ ] Step Sequencer
- [ ] Noise Generator (Perlin)
- [ ] Math Nodes (Add, Multiply, Lag)
- [ ] AudioWorklet für off-thread Analyse

### Phase 3: Visuals & Performance
- [ ] Multi-Instance System (InstancedMesh)
- [ ] Trail/Afterimage System
- [ ] LOD System
- [ ] Zusätzliche Visualizer: ParticleField, ShaderPlayground
- [ ] Zusätzliche Flächen: Gyroid, Costa, Seifert
- [ ] Custom Equation Editor

### Phase 4: UI & Polish
- [ ] Node Graph Editor (Canvas)
- [ ] Performance View (minimale UI für Live)
- [ ] Lissajous Scope
- [ ] Mobile/Touch Support
- [ ] Video Export (MediaRecorder)
- [ ] Mehr Factory Presets
- [ ] Dokumentation / Tutorials

---

## Claude Code Kontext

Dieses Dokument dient als Referenz für die Entwicklung mit Claude Code. Zentrale Regeln:

1. **TypeScript strict** — keine `any`, alle Interfaces definiert
2. **Keine Klassen-Vererbung** — Composition over Inheritance, Interfaces statt Abstract Classes
3. **Signals sind immer 0-1** — Mapping passiert in der Patchbay
4. **Kein GC-Druck** — TypedArrays für Audio-Daten, Object-Pools für häufige Allocations
5. **Jedes Modul ist unabhängig testbar** — keine zirkulären Dependencies
6. **UI ist optional** — die Engine läuft headless (für Tests, Server-Rendering)
7. **GPU-Arbeit minimieren** — conditional rendering, shared geometries, instancing
