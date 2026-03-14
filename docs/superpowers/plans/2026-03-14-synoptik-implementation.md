# Synoptik Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Synoptik, a modular real-time music visualization platform with 12 visualizers, 25 post-FX passes, Spotify integration, and a full modulation system.

**Architecture:** Clean-room TypeScript build using Vite 6 + Three.js r170+ + Preact/HTM + Zustand. GPU-first rendering with custom shaders for vertex displacement and post-processing. Modular plugin architecture for visualizers and FX passes.

**Tech Stack:** Vite 6, TypeScript (strict), Three.js, Zustand, Preact + HTM, Web Audio API, Spotify Web Playback SDK, pnpm

**Spec:** `docs/superpowers/specs/2026-03-14-synoptik-design.md`
**Prototype Reference:** `klein-bottle-v4.html`

---

## Chunk 1: Project Setup + Core Layer

This chunk produces: a buildable Vite project with all core types, event bus, clock, and registry. No visual output yet, but the foundation is testable.

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.env`
- Create: `.gitignore`

- [ ] **Step 1: Initialize pnpm project with scripts**

```bash
cd /c/Users/dasch/Documents/_Schabernack/Visualizer
pnpm init
```

Then add scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add three zustand preact htm lz-string
pnpm add -D typescript vite @vitejs/plugin-basic-ssl vitest @types/three @types/lz-string
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "paths": {
      "@core/*": ["./src/core/*"],
      "@input/*": ["./src/input/*"],
      "@modular/*": ["./src/modular/*"],
      "@visualizers/*": ["./src/visualizers/*"],
      "@scene/*": ["./src/scene/*"],
      "@postfx/*": ["./src/postfx/*"],
      "@ui/*": ["./src/ui/*"],
      "@state/*": ["./src/state/*"],
      "@utils/*": ["./src/utils/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'path'

export default defineConfig({
  plugins: [basicSsl()],
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@input': resolve(__dirname, 'src/input'),
      '@modular': resolve(__dirname, 'src/modular'),
      '@visualizers': resolve(__dirname, 'src/visualizers'),
      '@scene': resolve(__dirname, 'src/scene'),
      '@postfx': resolve(__dirname, 'src/postfx'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@state': resolve(__dirname, 'src/state'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  server: {
    https: true,
    port: 5173,
  },
  // SPA: serve index.html for all routes (Spotify callback /callback → SPA handles in JS)
  appType: 'spa',
  test: {
    // Vitest uses the same resolve aliases from above
    globals: true,
  },
})
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synoptik</title>
  <link rel="stylesheet" href="/src/ui/styles.css">
</head>
<body>
  <canvas id="gl"></canvas>
  <canvas id="ring"></canvas>
  <div id="ui-root"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: Create .env and .gitignore**

`.env`:
```
VITE_SPOTIFY_CLIENT_ID=e146e822fbd742ab8e5ad1f34fe7ea07
```

`.gitignore`:
```
node_modules/
dist/
.env
*.local
```

- [ ] **Step 7: Create minimal src/main.ts to verify build**

```typescript
console.log('Synoptik starting...')
```

- [ ] **Step 8: Verify build works**

Run: `pnpm dev`
Expected: Dev server starts on https://localhost:5173, console shows "Synoptik starting..."

- [ ] **Step 9: Commit**

```bash
git init
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts index.html .gitignore src/main.ts CLAUDE.md SYNOPTIK-Konzept.md docs/
git commit -m "feat: project scaffolding with Vite + TypeScript"
```

---

### Task 2: Utility Functions

**Files:**
- Create: `src/utils/math.ts`
- Create: `src/utils/color.ts`
- Create: `src/utils/index.ts`
- Test: `src/utils/__tests__/math.test.ts`
- Test: `src/utils/__tests__/color.test.ts`

- [ ] **Step 1: Write math utility tests**

```typescript
// src/utils/__tests__/math.test.ts
import { describe, it, expect } from 'vitest'
import { lerp, clamp, smoothstep, mapRange } from '../math'

describe('math utils', () => {
  describe('lerp', () => {
    it('returns start at t=0', () => expect(lerp(0, 10, 0)).toBe(0))
    it('returns end at t=1', () => expect(lerp(0, 10, 1)).toBe(10))
    it('returns midpoint at t=0.5', () => expect(lerp(0, 10, 0.5)).toBe(5))
  })

  describe('clamp', () => {
    it('clamps below min', () => expect(clamp(-1, 0, 1)).toBe(0))
    it('clamps above max', () => expect(clamp(2, 0, 1)).toBe(1))
    it('passes through in range', () => expect(clamp(0.5, 0, 1)).toBe(0.5))
  })

  describe('smoothstep', () => {
    it('returns 0 at t=0', () => expect(smoothstep(0)).toBe(0))
    it('returns 1 at t=1', () => expect(smoothstep(1)).toBe(1))
    it('returns 0.5 at t=0.5', () => expect(smoothstep(0.5)).toBe(0.5))
    it('is smooth (derivative 0 at endpoints)', () => {
      expect(smoothstep(0.01)).toBeGreaterThan(0)
      expect(smoothstep(0.01)).toBeLessThan(0.01 * 2)
    })
  })

  describe('mapRange', () => {
    it('maps 0-1 to 0-100', () => expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50))
    it('maps 0-100 to 0-1', () => expect(mapRange(50, 0, 100, 0, 1)).toBe(0.5))
    it('handles inverted ranges', () => expect(mapRange(0.75, 0, 1, 100, 0)).toBe(25))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/utils/__tests__/math.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement math.ts**

```typescript
// src/utils/math.ts
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/utils/__tests__/math.test.ts`
Expected: All PASS

- [ ] **Step 5: Write color utility tests**

```typescript
// src/utils/__tests__/color.test.ts
import { describe, it, expect } from 'vitest'
import { wrapHue, hslToRgb } from '../color'

describe('color utils', () => {
  describe('wrapHue', () => {
    it('wraps above 1', () => expect(wrapHue(1.3)).toBeCloseTo(0.3))
    it('wraps below 0', () => expect(wrapHue(-0.2)).toBeCloseTo(0.8))
    it('passes through 0-1', () => expect(wrapHue(0.5)).toBe(0.5))
  })

  describe('hslToRgb', () => {
    it('converts red', () => {
      const [r, g, b] = hslToRgb(0, 1, 0.5)
      expect(r).toBeCloseTo(1)
      expect(g).toBeCloseTo(0)
      expect(b).toBeCloseTo(0)
    })
    it('converts white', () => {
      const [r, g, b] = hslToRgb(0, 0, 1)
      expect(r).toBeCloseTo(1)
      expect(g).toBeCloseTo(1)
      expect(b).toBeCloseTo(1)
    })
  })
})
```

- [ ] **Step 6: Implement color.ts**

```typescript
// src/utils/color.ts
export function wrapHue(h: number): number {
  const wrapped = h % 1
  return wrapped < 0 ? wrapped + 1 : wrapped
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l]
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)]
}
```

- [ ] **Step 7: Create barrel export**

```typescript
// src/utils/index.ts
export { lerp, clamp, smoothstep, mapRange } from './math'
export { wrapHue, hslToRgb } from './color'
```

- [ ] **Step 8: Run all util tests**

Run: `pnpm vitest run src/utils/`
Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add src/utils/
git commit -m "feat: math and color utility functions with tests"
```

---

### Task 3: Core Types

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/index.ts`

- [ ] **Step 1: Create core types**

Port all interfaces from spec Section 2. This is a types-only file — no runtime code, no tests needed.

```typescript
// src/core/types.ts

// ─── Signal System ───────────────────────────────────
export interface Signal {
  id: string
  label: string
  value: number        // 0–1 normalized
  group: string        // 'bands' | 'analysis' | 'extended' | 'lfo' | 'envelope' | 'macro'
}

export type CurveType = 'linear' | 'exp' | 'log' | 'step'

export interface Patch {
  sourceId: string
  destId: string
  amount: number       // -1..+1 (bipolar)
  curve: CurveType
  lag: number          // 0–1 slew rate
}

export interface Destination {
  id: string
  label: string
  group: string
  defaultSource: string
  defaultAmount: number
  min: number
  max: number
  colorIndex: number
}

// ─── Style ───────────────────────────────────────────
export interface StylePreset {
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

// ─── Visualizer ──────────────────────────────────────
export type VisualizerCategory = 'surface' | '3d' | '2d'

export interface VisualizerParam {
  id: string
  label: string
  type: 'slider' | 'select'
  min?: number
  max?: number
  default: number
  options?: Array<{ value: number; label: string }>
  group: string
}

export interface VisualizerToggle {
  id: string
  label: string
  default: boolean
}

export interface VisualizerContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  canvas2d?: CanvasRenderingContext2D
  width: number
  height: number
}

export interface Visualizer {
  id: string
  name: string
  category: VisualizerCategory
  description: string
  params: VisualizerParam[]
  toggles: VisualizerToggle[]

  init(context: VisualizerContext): void
  update(dt: number, patchbay: Patchbay): void
  resize(width: number, height: number): void
  dispose(): void
  setOpacity(opacity: number): void
}

// ─── FX ──────────────────────────────────────────────
export interface FXParam {
  id: string
  label: string
  value: number
  min: number
  max: number
  group: string
}

export interface FXPass {
  id: string
  label: string
  enabled: boolean
  order: number
  params: FXParam[]

  init(renderer: THREE.WebGLRenderer, width: number, height: number): void
  resize(width: number, height: number): void
  render(
    renderer: THREE.WebGLRenderer,
    inputRT: THREE.WebGLRenderTarget,
    outputRT: THREE.WebGLRenderTarget | null,
    uniforms: { time: number; dt: number },
  ): void
  isActive(): boolean
  dispose(): void
}

// ─── LFO ─────────────────────────────────────────────
export type Waveform = 'sin' | 'tri' | 'saw' | 'sqr' | 's&h'

export interface LFOConfig {
  rate: number
  waveform: Waveform
  depth: number
  phaseOffset: number
  retriggerOnBeat: boolean
}

// ─── Macro ───────────────────────────────────────────
export interface MacroBinding {
  destId: string
  amount: number
}

export interface MacroConfig {
  id: string
  label: string
  value: number
  bindings: MacroBinding[]
}

// ─── Preset ──────────────────────────────────────────
export interface SynoptikPreset {
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

// ─── Bus Events ──────────────────────────────────────
export interface BusEvents {
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

// Forward reference for Patchbay (used in Visualizer interface)
export interface Patchbay {
  get(destId: string): number
  update(signals: Record<string, number>, dt: number): void
  setPatch(destId: string, sourceId: string, amount: number, curve: CurveType, lag: number): void
  clearPatch(destId: string): void
  registerDestinations(dests: Destination[]): void
  unregisterDestinations(ids: string[]): void
  getDestinations(): Destination[]
  getPatches(): Map<string, { sourceId: string; amount: number; curve: CurveType; lag: number }>
}
```

Note: `THREE` types come from `@types/three`. The file uses interface-only references so it compiles without importing Three.js at runtime. Add a triple-slash reference or import type-only:

```typescript
import type * as THREE from 'three'
```

at the top of the file.

- [ ] **Step 2: Create barrel export**

```typescript
// src/core/index.ts
export type {
  Signal, Patch, Destination, CurveType,
  StylePreset,
  Visualizer, VisualizerParam, VisualizerToggle, VisualizerContext, VisualizerCategory,
  FXPass, FXParam,
  Waveform, LFOConfig,
  MacroBinding, MacroConfig,
  SynoptikPreset, BusEvents, Patchbay,
} from './types'
export type { Bus } from './bus'
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/core/
git commit -m "feat: core type definitions"
```

---

### Task 4: Event Bus

**Files:**
- Create: `src/core/bus.ts`
- Test: `src/core/__tests__/bus.test.ts`

- [ ] **Step 1: Write bus tests**

```typescript
// src/core/__tests__/bus.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createBus } from '../bus'

describe('EventBus', () => {
  it('calls listeners on emit', () => {
    const bus = createBus()
    const fn = vi.fn()
    bus.on('beat:detected', fn)
    bus.emit('beat:detected', undefined)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('passes payload to listeners', () => {
    const bus = createBus()
    const fn = vi.fn()
    bus.on('audio:connected', fn)
    bus.emit('audio:connected', { mode: 'mic' })
    expect(fn).toHaveBeenCalledWith({ mode: 'mic' })
  })

  it('removes listener with off()', () => {
    const bus = createBus()
    const fn = vi.fn()
    bus.on('beat:detected', fn)
    bus.off('beat:detected', fn)
    bus.emit('beat:detected', undefined)
    expect(fn).not.toHaveBeenCalled()
  })

  it('supports multiple listeners', () => {
    const bus = createBus()
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    bus.on('beat:detected', fn1)
    bus.on('beat:detected', fn2)
    bus.emit('beat:detected', undefined)
    expect(fn1).toHaveBeenCalledOnce()
    expect(fn2).toHaveBeenCalledOnce()
  })

  it('does not throw on emit with no listeners', () => {
    const bus = createBus()
    expect(() => bus.emit('beat:detected', undefined)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/core/__tests__/bus.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement bus.ts**

```typescript
// src/core/bus.ts
import type { BusEvents } from './types'

type Listener<T> = (payload: T) => void

interface Bus {
  on<K extends keyof BusEvents>(event: K, listener: Listener<BusEvents[K]>): void
  off<K extends keyof BusEvents>(event: K, listener: Listener<BusEvents[K]>): void
  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void
}

export type { Bus }

export function createBus(): Bus {
  const listeners = new Map<string, Set<Listener<unknown>>>()

  return {
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(listener as Listener<unknown>)
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener as Listener<unknown>)
    },
    emit(event, payload) {
      listeners.get(event)?.forEach(fn => fn(payload))
    },
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/core/__tests__/bus.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/bus.ts src/core/__tests__/
git commit -m "feat: typed event bus"
```

---

### Task 5: Clock

**Files:**
- Create: `src/core/clock.ts`
- Test: `src/core/__tests__/clock.test.ts`

- [ ] **Step 1: Write clock tests**

```typescript
// src/core/__tests__/clock.test.ts
import { describe, it, expect } from 'vitest'
import { createClock } from '../clock'

describe('Clock', () => {
  it('starts at zero', () => {
    const clock = createClock()
    expect(clock.elapsed).toBe(0)
    expect(clock.frame).toBe(0)
    expect(clock.dt).toBe(0)
  })

  it('advances on update', () => {
    const clock = createClock()
    clock.update(16.67) // ms
    expect(clock.dt).toBeCloseTo(0.01667, 3)
    expect(clock.elapsed).toBeCloseTo(0.01667, 3)
    expect(clock.frame).toBe(1)
  })

  it('caps dt at 50ms to prevent spiral of death', () => {
    const clock = createClock()
    clock.update(200) // 200ms = tab was backgrounded
    expect(clock.dt).toBe(0.05) // capped
  })

  it('accumulates elapsed time', () => {
    const clock = createClock()
    clock.update(16.67)
    clock.update(16.67)
    clock.update(16.67)
    expect(clock.elapsed).toBeCloseTo(0.05, 2)
    expect(clock.frame).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/core/__tests__/clock.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement clock.ts**

```typescript
// src/core/clock.ts
const MAX_DT = 0.05 // 50ms cap

interface Clock {
  dt: number
  elapsed: number
  frame: number
  update(deltaMs: number): void
}

export function createClock(): Clock {
  const clock: Clock = {
    dt: 0,
    elapsed: 0,
    frame: 0,
    update(deltaMs: number) {
      clock.dt = Math.min(deltaMs / 1000, MAX_DT)
      clock.elapsed += clock.dt
      clock.frame++
    },
  }
  return clock
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/core/__tests__/clock.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/clock.ts src/core/__tests__/clock.test.ts
git commit -m "feat: frame clock with dt cap"
```

---

### Task 6: Registry

**Files:**
- Create: `src/core/registry.ts`
- Test: `src/core/__tests__/registry.test.ts`

- [ ] **Step 1: Write registry tests**

```typescript
// src/core/__tests__/registry.test.ts
import { describe, it, expect } from 'vitest'
import { createRegistry } from '../registry'
import type { Visualizer } from '../types'

const mockViz: Visualizer = {
  id: 'test',
  name: 'Test Viz',
  category: '2d',
  description: 'A test',
  params: [],
  toggles: [],
  init: () => {},
  update: () => {},
  resize: () => {},
  dispose: () => {},
  setOpacity: () => {},
}

describe('Registry', () => {
  it('registers and retrieves a visualizer', () => {
    const reg = createRegistry()
    reg.registerVisualizer(mockViz)
    expect(reg.getVisualizer('test')).toBe(mockViz)
  })

  it('returns undefined for unknown id', () => {
    const reg = createRegistry()
    expect(reg.getVisualizer('nope')).toBeUndefined()
  })

  it('lists registered visualizers', () => {
    const reg = createRegistry()
    reg.registerVisualizer(mockViz)
    const list = reg.getVisualizerList()
    expect(list).toHaveLength(1)
    expect(list[0]).toEqual({ id: 'test', name: 'Test Viz', category: '2d', description: 'A test' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/core/__tests__/registry.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement registry.ts**

```typescript
// src/core/registry.ts
import type { Visualizer, VisualizerCategory } from './types'

interface VisualizerInfo {
  id: string
  name: string
  category: VisualizerCategory
  description: string
}

interface Registry {
  registerVisualizer(viz: Visualizer): void
  getVisualizer(id: string): Visualizer | undefined
  getVisualizerList(): VisualizerInfo[]
}

export function createRegistry(): Registry {
  const visualizers = new Map<string, Visualizer>()

  return {
    registerVisualizer(viz) {
      visualizers.set(viz.id, viz)
    },
    getVisualizer(id) {
      return visualizers.get(id)
    },
    getVisualizerList() {
      return [...visualizers.values()].map(v => ({
        id: v.id,
        name: v.name,
        category: v.category,
        description: v.description,
      }))
    },
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/core/__tests__/registry.test.ts`
Expected: All PASS

- [ ] **Step 5: Update core barrel export**

Add to `src/core/index.ts`:
```typescript
export { createBus } from './bus'
export { createClock } from './clock'
export { createRegistry } from './registry'
```

- [ ] **Step 6: Run all core tests**

Run: `pnpm vitest run src/core/`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/core/
git commit -m "feat: plugin registry for visualizers"
```

---

## Chunk 2: Modular Layer

This chunk produces: LFOs, Envelope Followers, Macros, and the Patchbay. All testable without DOM or Three.js.

### Task 7: LFO

**Files:**
- Create: `src/modular/LFO.ts`
- Test: `src/modular/__tests__/LFO.test.ts`

- [ ] **Step 1: Write LFO tests**

```typescript
// src/modular/__tests__/LFO.test.ts
import { describe, it, expect } from 'vitest'
import { createLFO } from '../LFO'

describe('LFO', () => {
  it('starts at 0 phase', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    expect(lfo.phase).toBe(0)
  })

  it('sine outputs 0.5 at phase 0 (sin(0)*0.5+0.5)', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'sin', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    // At phase 0, sin(0) = 0, so value = 0*0.5+0.5 = 0.5
    expect(lfo.value).toBeCloseTo(0.5, 1)
  })

  it('advances phase over time', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(0.5) // half a second at 1Hz = phase 0.5
    expect(lfo.phase).toBeCloseTo(0.5, 2)
    expect(lfo.value).toBeCloseTo(0.5, 2) // saw = phase
  })

  it('wraps phase past 1', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(1.5) // 1.5 seconds at 1Hz
    expect(lfo.phase).toBeCloseTo(0.5, 2)
  })

  it('applies depth', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'sqr', depth: 0.5, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(0.1) // phase 0.1, sqr at phase<0.5 = 1, * depth 0.5 = 0.5
    expect(lfo.value).toBeCloseTo(0.5, 2)
  })

  it('applies phase offset', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0.25, retriggerOnBeat: false })
    // At time 0, effective phase = 0 + 0.25 = 0.25, saw = 0.25
    expect(lfo.value).toBeCloseTo(0.25, 2)
  })

  it('retrigger resets phase', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'saw', depth: 1, phaseOffset: 0, retriggerOnBeat: true })
    lfo.update(0.7) // phase 0.7
    lfo.retrigger()
    expect(lfo.phase).toBe(0)
  })

  it('triangle waveform', () => {
    const lfo = createLFO('lfo1', { rate: 1, waveform: 'tri', depth: 1, phaseOffset: 0, retriggerOnBeat: false })
    lfo.update(0.25) // phase 0.25, tri at 0.25 = 0.25*2 = 0.5 (first half rising)
    // Actually: p<0.5 → p*2, so at 0.25: 0.25*2 = 0.5
    expect(lfo.value).toBeCloseTo(0.5, 2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/modular/__tests__/LFO.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement LFO.ts**

```typescript
// src/modular/LFO.ts
import type { Waveform, LFOConfig } from '@core/types'

interface LFO {
  readonly id: string
  value: number
  phase: number
  rate: number
  waveform: Waveform
  depth: number
  phaseOffset: number
  retriggerOnBeat: boolean
  update(dt: number): void
  retrigger(): void
}

export function createLFO(id: string, config: LFOConfig): LFO {
  let phase = 0
  let shValue = Math.random()
  let shAccum = 0

  const lfo: LFO = {
    id,
    value: 0,
    get phase() { return phase },
    set phase(v) { phase = v },
    rate: config.rate,
    waveform: config.waveform,
    depth: config.depth,
    phaseOffset: config.phaseOffset,
    retriggerOnBeat: config.retriggerOnBeat,

    update(dt: number) {
      phase += lfo.rate * dt
      if (phase > 1) phase -= Math.floor(phase)

      const p = (phase + lfo.phaseOffset) % 1
      let raw: number

      switch (lfo.waveform) {
        case 'sin':
          raw = Math.sin(p * Math.PI * 2) * 0.5 + 0.5
          break
        case 'tri':
          raw = p < 0.5 ? p * 2 : (1 - p) * 2
          break
        case 'saw':
          raw = p
          break
        case 'sqr':
          raw = p < 0.5 ? 1 : 0
          break
        case 's&h':
          shAccum += dt * lfo.rate
          if (shAccum >= 1) {
            shAccum -= 1
            shValue = Math.random()
          }
          raw = shValue
          break
      }

      lfo.value = raw * lfo.depth
    },

    retrigger() {
      phase = 0
    },
  }

  // Compute initial value
  const p = lfo.phaseOffset % 1
  switch (lfo.waveform) {
    case 'sin': lfo.value = (Math.sin(p * Math.PI * 2) * 0.5 + 0.5) * lfo.depth; break
    case 'tri': lfo.value = (p < 0.5 ? p * 2 : (1 - p) * 2) * lfo.depth; break
    case 'saw': lfo.value = p * lfo.depth; break
    case 'sqr': lfo.value = (p < 0.5 ? 1 : 0) * lfo.depth; break
    case 's&h': lfo.value = shValue * lfo.depth; break
  }

  return lfo
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/modular/__tests__/LFO.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/modular/
git commit -m "feat: LFO with all waveforms, phase offset, beat retrigger"
```

---

### Task 8: Envelope Follower

**Files:**
- Create: `src/modular/EnvelopeFollower.ts`
- Test: `src/modular/__tests__/EnvelopeFollower.test.ts`

- [ ] **Step 1: Write envelope tests**

```typescript
// src/modular/__tests__/EnvelopeFollower.test.ts
import { describe, it, expect } from 'vitest'
import { createEnvelope } from '../EnvelopeFollower'

describe('EnvelopeFollower', () => {
  it('starts at 0', () => {
    const env = createEnvelope('env1', 'bass', 0.01, 0.3)
    expect(env.value).toBe(0)
  })

  it('rises toward input (attack)', () => {
    const env = createEnvelope('env1', 'bass', 0.01, 0.3)
    env.update(0.016, 1.0) // input = 1, should rise
    expect(env.value).toBeGreaterThan(0)
    expect(env.value).toBeLessThan(1)
  })

  it('falls toward input (release)', () => {
    const env = createEnvelope('env1', 'bass', 0.001, 0.3)
    // First push it up
    for (let i = 0; i < 100; i++) env.update(0.016, 1.0)
    expect(env.value).toBeGreaterThan(0.9)
    // Now release
    env.update(0.016, 0)
    expect(env.value).toBeLessThan(1)
    expect(env.value).toBeGreaterThan(0)
  })

  it('faster attack = faster rise', () => {
    const fast = createEnvelope('e1', 'bass', 0.001, 0.3)
    const slow = createEnvelope('e2', 'bass', 0.1, 0.3)
    fast.update(0.016, 1.0)
    slow.update(0.016, 1.0)
    expect(fast.value).toBeGreaterThan(slow.value)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/modular/__tests__/EnvelopeFollower.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement EnvelopeFollower.ts**

```typescript
// src/modular/EnvelopeFollower.ts
interface Envelope {
  readonly id: string
  source: string
  attack: number   // seconds
  release: number  // seconds
  value: number    // 0–1
  update(dt: number, input: number): void
}

export function createEnvelope(id: string, source: string, attack: number, release: number): Envelope {
  const env: Envelope = {
    id,
    source,
    attack,
    release,
    value: 0,
    update(dt: number, input: number) {
      const coeff = input > env.value
        ? Math.min(1, dt / Math.max(env.attack, 0.001))
        : Math.min(1, dt / Math.max(env.release, 0.001))
      env.value += (input - env.value) * coeff
    },
  }
  return env
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/modular/__tests__/EnvelopeFollower.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/modular/EnvelopeFollower.ts src/modular/__tests__/EnvelopeFollower.test.ts
git commit -m "feat: envelope follower with attack/release"
```

---

### Task 9: Patchbay

**Files:**
- Create: `src/modular/Patchbay.ts`
- Test: `src/modular/__tests__/Patchbay.test.ts`

- [ ] **Step 1: Write Patchbay tests**

```typescript
// src/modular/__tests__/Patchbay.test.ts
import { describe, it, expect } from 'vitest'
import { createPatchbay } from '../Patchbay'
import type { Destination } from '@core/types'

const testDest: Destination = {
  id: 'scale', label: 'Scale', group: 'transform',
  defaultSource: 'none', defaultAmount: 50,
  min: -1, max: 1, colorIndex: 1,
}

describe('Patchbay', () => {
  it('returns 0 for unpatched destination', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.update({ bass: 0.8 }, 1/60)
    expect(pb.get('scale')).toBe(0)
  })

  it('applies linear modulation', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'linear', 0) // amount=+1, full range
    pb.update({ bass: 0.5 }, 1/60)
    // modValue = sourceValue * bipolarAmount * (max - min)
    // = 0.5 * 1.0 * (1 - (-1)) = 0.5 * 1.0 * 2 = 1.0
    expect(pb.get('scale')).toBeCloseTo(1.0)
  })

  it('applies bipolar amount', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', -0.5, 'linear', 0)
    pb.update({ bass: 1.0 }, 1/60)
    // = 1.0 * -0.5 * 2 = -1.0
    expect(pb.get('scale')).toBeCloseTo(-1.0)
  })

  it('applies exp curve', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'exp', 0)
    pb.update({ bass: 0.5 }, 1/60)
    // exp: v*v = 0.25, then * 1.0 * 2 = 0.5
    expect(pb.get('scale')).toBeCloseTo(0.5)
  })

  it('applies log curve', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'log', 0)
    pb.update({ bass: 0.25 }, 1/60)
    // log: sqrt(0.25) = 0.5, then * 1.0 * 2 = 1.0
    expect(pb.get('scale')).toBeCloseTo(1.0)
  })

  it('applies step curve', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'step', 0)
    pb.update({ bass: 0.3 }, 1/60)
    // step: floor(0.3 * 4) / 4 = floor(1.2)/4 = 1/4 = 0.25
    // then * 1.0 * 2 = 0.5
    expect(pb.get('scale')).toBeCloseTo(0.5)
  })

  it('applies lag/slew', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'linear', 0.9) // high lag
    pb.update({ bass: 1.0 }, 1/60)
    const first = pb.get('scale')
    // With high lag, value should be much less than full
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(1.0)
  })

  it('clears a patch', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'linear', 0)
    pb.clearPatch('scale')
    pb.update({ bass: 1.0 }, 1/60)
    expect(pb.get('scale')).toBe(0)
  })

  it('unregisters destinations', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'bass', 1.0, 'linear', 0)
    pb.unregisterDestinations(['scale'])
    pb.update({ bass: 1.0 }, 1/60)
    expect(pb.get('scale')).toBe(0)
  })

  it('returns 0 for unknown source', () => {
    const pb = createPatchbay()
    pb.registerDestinations([testDest])
    pb.setPatch('scale', 'nonexistent', 1.0, 'linear', 0)
    pb.update({}, 1/60)
    expect(pb.get('scale')).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/modular/__tests__/Patchbay.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Patchbay.ts**

```typescript
// src/modular/Patchbay.ts
import type { CurveType, Destination, Patchbay as PatchbayInterface } from '@core/types'

interface PatchEntry {
  sourceId: string
  amount: number
  curve: CurveType
  lag: number
}

function applyCurve(value: number, curve: CurveType): number {
  switch (curve) {
    case 'linear': return value
    case 'exp': return value * value
    case 'log': return Math.sqrt(value)
    case 'step': return Math.floor(value * 4) / 4
  }
}

export function createPatchbay(): PatchbayInterface {
  const destinations = new Map<string, Destination>()
  const patches = new Map<string, PatchEntry>()
  const modValues = new Map<string, number>()
  const laggedValues = new Map<string, number>()

  return {
    registerDestinations(dests: Destination[]) {
      for (const d of dests) {
        destinations.set(d.id, d)
        modValues.set(d.id, 0)
        laggedValues.set(d.id, 0)
      }
    },

    unregisterDestinations(ids: string[]) {
      for (const id of ids) {
        destinations.delete(id)
        patches.delete(id)
        modValues.delete(id)
        laggedValues.delete(id)
      }
    },

    setPatch(destId, sourceId, amount, curve, lag) {
      patches.set(destId, { sourceId, amount, curve, lag })
    },

    clearPatch(destId) {
      patches.delete(destId)
      modValues.set(destId, 0)
      laggedValues.set(destId, 0)
    },

    update(signals: Record<string, number>, dt: number) {
      for (const [destId, patch] of patches) {
        const dest = destinations.get(destId)
        if (!dest) continue

        const raw = signals[patch.sourceId] ?? 0
        const curved = applyCurve(raw, patch.curve)
        const target = curved * patch.amount * (dest.max - dest.min)

        if (patch.lag > 0) {
          const prev = laggedValues.get(destId) ?? 0
          const slew = (1 - patch.lag) * dt * 60
          const lagged = prev + (target - prev) * Math.min(slew, 1)
          laggedValues.set(destId, lagged)
          modValues.set(destId, lagged)
        } else {
          modValues.set(destId, target)
          laggedValues.set(destId, target)
        }
      }
    },

    get(destId: string): number {
      return modValues.get(destId) ?? 0
    },

    getDestinations(): Destination[] {
      return [...destinations.values()]
    },

    getPatches() {
      return new Map(patches)
    },
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/modular/__tests__/Patchbay.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/modular/Patchbay.ts src/modular/__tests__/Patchbay.test.ts
git commit -m "feat: patchbay with curves and lag/slew"
```

---

### Task 10: Macros

**Files:**
- Create: `src/modular/Macros.ts`
- Test: `src/modular/__tests__/Macros.test.ts`

- [ ] **Step 1: Write Macro tests**

```typescript
// src/modular/__tests__/Macros.test.ts
import { describe, it, expect } from 'vitest'
import { createMacro } from '../Macros'

describe('Macro', () => {
  it('starts with value 0', () => {
    const m = createMacro('macro1', 'Macro 1')
    expect(m.value).toBe(0)
    expect(m.bindings).toEqual([])
  })

  it('stores value', () => {
    const m = createMacro('macro1', 'Macro 1')
    m.value = 0.75
    expect(m.value).toBe(0.75)
  })

  it('manages bindings', () => {
    const m = createMacro('macro1', 'Macro 1')
    m.addBinding('scale', 0.5)
    expect(m.bindings).toHaveLength(1)
    expect(m.bindings[0]).toEqual({ destId: 'scale', amount: 0.5 })
  })

  it('removes bindings', () => {
    const m = createMacro('macro1', 'Macro 1')
    m.addBinding('scale', 0.5)
    m.addBinding('hue', -0.3)
    m.removeBinding('scale')
    expect(m.bindings).toHaveLength(1)
    expect(m.bindings[0]?.destId).toBe('hue')
  })

  it('exposes as signal source (0-1)', () => {
    const m = createMacro('macro1', 'Macro 1')
    m.value = 0.6
    expect(m.signal.id).toBe('macro1')
    expect(m.signal.value).toBe(0.6)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/modular/__tests__/Macros.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Macros.ts**

```typescript
// src/modular/Macros.ts
import type { Signal, MacroBinding } from '@core/types'

interface Macro {
  readonly id: string
  label: string
  value: number
  readonly bindings: ReadonlyArray<MacroBinding>
  readonly signal: Signal
  addBinding(destId: string, amount: number): void
  removeBinding(destId: string): void
}

export function createMacro(id: string, label: string): Macro {
  const bindings: MacroBinding[] = []

  const macro: Macro = {
    id,
    label,
    value: 0,

    get bindings() { return bindings },

    get signal(): Signal {
      return { id: macro.id, label: macro.label, value: macro.value, group: 'macro' }
    },

    addBinding(destId: string, amount: number) {
      bindings.push({ destId, amount })
    },

    removeBinding(destId: string) {
      const idx = bindings.findIndex(b => b.destId === destId)
      if (idx >= 0) bindings.splice(idx, 1)
    },
  }

  return macro
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/modular/__tests__/Macros.test.ts`
Expected: All PASS

- [ ] **Step 5: Create modular barrel export and commit**

```typescript
// src/modular/index.ts
export { createLFO } from './LFO'
export { createEnvelope } from './EnvelopeFollower'
export { createPatchbay } from './Patchbay'
export { createMacro } from './Macros'
```

```bash
git add src/modular/
git commit -m "feat: macros with multi-destination bindings"
```

---

## Chunk 3: Input Layer

This chunk produces: AudioEngine, AudioAnalyser, and SpotifyPlayer. After this, audio input works and produces signals.

### Task 11: AudioEngine

**Files:**
- Create: `src/input/AudioEngine.ts`

- [ ] **Step 1: Implement AudioEngine**

This module depends on browser APIs (AudioContext, getUserMedia, getDisplayMedia) so it cannot be unit-tested without mocking the entire Web Audio API. Instead, we test it via integration in the browser.

```typescript
// src/input/AudioEngine.ts
import type { Bus } from '@core/bus'
// Bus type is exported from bus.ts

type AudioMode = 'mic' | 'tab' | 'file' | 'spotify' | null

interface AudioEngine {
  readonly context: AudioContext
  readonly analyserNode: AnalyserNode
  readonly mode: AudioMode
  readonly isActive: boolean
  connectMic(): Promise<void>
  connectTabCapture(): Promise<void>
  connectFile(file: File): Promise<void>
  connectSpotify(stream: MediaStream): void
  disconnect(): void
}

export function createAudioEngine(bus: Bus): AudioEngine {
  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null
  let stream: MediaStream | null = null
  let audioElement: HTMLAudioElement | null = null
  let mode: AudioMode = null

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
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      stream = null
    }
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      audioElement = null
    }
    if (source) {
      try { source.disconnect() } catch { /* ignore */ }
      source = null
    }
    // Disconnect analyser from destination if it was connected
    if (analyser) {
      try { analyser.disconnect() } catch { /* ignore */ }
    }
  }

  const engine: AudioEngine = {
    get context() { return ensureContext().ctx },
    get analyserNode() { return ensureContext().analyser },
    get mode() { return mode },
    get isActive() { return mode !== null },

    async connectMic() {
      const { ctx: c, analyser: a } = ensureContext()
      cleanupSource()
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        source = c.createMediaStreamSource(stream)
        source.connect(a)
        mode = 'mic'
        bus.emit('audio:connected', { mode: 'mic' })
      } catch (e) {
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
      } catch (e) {
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
      // Don't connect to destination — Spotify SDK handles playback
      mode = 'spotify'
      bus.emit('audio:connected', { mode: 'spotify' })
    },

    disconnect() {
      cleanupSource()
      mode = null
      bus.emit('audio:disconnected', undefined)
    },
  }

  return engine
}
```

- [ ] **Step 2: Commit**

```bash
git add src/input/AudioEngine.ts
git commit -m "feat: audio engine with mic, tab capture, file, spotify sources"
```

---

### Task 12: AudioAnalyser

**Files:**
- Create: `src/input/AudioAnalyser.ts`
- Test: `src/input/__tests__/AudioAnalyser.test.ts`

- [ ] **Step 1: Write analyser tests (pure math functions)**

We can test the band calculation and analysis logic with mock data, without needing a real AnalyserNode.

```typescript
// src/input/__tests__/AudioAnalyser.test.ts
import { describe, it, expect } from 'vitest'
import { computeBands, computeAnalysis, BANDS } from '../AudioAnalyser'

describe('AudioAnalyser', () => {
  describe('BANDS', () => {
    it('has 8 bands', () => expect(BANDS).toHaveLength(8))
    it('covers 20Hz to 20kHz', () => {
      expect(BANDS[0]!.lo).toBe(20)
      expect(BANDS[BANDS.length - 1]!.hi).toBe(20000)
    })
  })

  describe('computeBands', () => {
    it('returns 0 for silent spectrum', () => {
      const fd = new Uint8Array(2048).fill(0)
      const prev = new Float32Array(8)
      const result = computeBands(fd, prev, 44100, 1.0, 0.35)
      expect(result.every(v => v === 0)).toBe(true)
    })

    it('returns values 0-1 for loud spectrum', () => {
      const fd = new Uint8Array(2048).fill(200)
      const prev = new Float32Array(8)
      const result = computeBands(fd, prev, 44100, 1.0, 0.35)
      result.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('computeAnalysis', () => {
    it('energy is 0 for silence', () => {
      const fd = new Uint8Array(2048).fill(0)
      const td = new Uint8Array(4096).fill(128) // silence = 128 in byte domain
      const prevSpectrum = new Float32Array(2048)
      const energyHistory = new Float32Array(80)
      const prevAnalysis = { energy: 0, peak: 0, rms: 0, centroid: 0, flux: 0, spread: 0, zcr: 0, crest: 0, beat: 0, onset: 0, rolloff: 0, loudness: 0, bassRatio: 0.5 }
      const result = computeAnalysis(fd, td, prevSpectrum, energyHistory, 0, prevAnalysis, 44100, 1.0, 0.4, 0)
      expect(result.energy).toBe(0)
      expect(result.rms).toBeCloseTo(0, 1)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/input/__tests__/AudioAnalyser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement AudioAnalyser.ts**

This is a large file. Implement the core analysis logic as pure functions (`computeBands`, `computeAnalysis`) that are exported and testable, plus a `createAudioAnalyser` factory that wraps an AnalyserNode.

Port the analysis math from the prototype's `AE.update()` method (lines 256-269 of klein-bottle-v4.html). Add the 4 new extended signals: onset, rolloff, loudness, bassRatio.

Key implementation details:
- All TypedArrays allocated at module level (zero GC)
- `BANDS` array exported as const for test access
- `computeBands(frequencyData, prevBands, sampleRate, gain, smoothing)` returns `Float32Array(8)`
- `computeAnalysis(frequencyData, timeDomainData, prevSpectrum, energyHistory, historyIndex, prevAnalysis, sampleRate, gain, beatSensitivity, elapsed)` returns analysis object
- `createAudioAnalyser(analyserNode)` returns `{ update(gain, smoothing), getBands(), getAnalysis(), getFrequencyData(), getTimeDomainData() }`

Full implementation follows prototype math exactly, plus:
- `onset`: like beat but with 50ms cooldown instead of 100-200ms
- `rolloff`: frequency below which 85% of spectral energy lies, normalized to 0-1
- `loudness`: exponentially weighted moving average of RMS over ~20 frames
- `bassRatio`: `bands.bass / (bands.bass + bands.high)`, clamped 0-1

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/input/__tests__/AudioAnalyser.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/input/AudioAnalyser.ts src/input/__tests__/
git commit -m "feat: audio analyser with 8 bands + 13 analysis outputs"
```

---

### Task 13: SpotifyPlayer

**Files:**
- Create: `src/input/SpotifyPlayer.ts`

- [ ] **Step 1: Implement SpotifyPlayer**

Browser-only module (no unit tests — requires Spotify SDK and auth redirect). Implement PKCE auth flow, SDK loading, and stream capture.

Key implementation:
- `generateCodeVerifier()` and `generateCodeChallenge()` for PKCE
- `createSpotifyPlayer(audioEngine)` factory
- Auth state in `sessionStorage`
- SDK loaded dynamically via `<script>` tag
- Token refresh before expiry via `setTimeout`
- `connect()` triggers redirect to Spotify auth
- `handleCallback(code)` exchanges code for token
- After SDK ready: locate audio element or fall back to tab capture message

- [ ] **Step 2: Create input barrel export**

```typescript
// src/input/index.ts
export { createAudioEngine } from './AudioEngine'
export { createAudioAnalyser, BANDS } from './AudioAnalyser'
export { createSpotifyPlayer } from './SpotifyPlayer'
```

- [ ] **Step 3: Commit**

```bash
git add src/input/
git commit -m "feat: spotify player with PKCE auth and playback SDK"
```

---

## Chunk 4: Scene Layer + Parametric Surface

This chunk produces: first visual output. Three.js scene with the parametric surface visualizer rendering, materials, and Fresnel shader. After this, you can see a Klein Bottle in the browser.

### Task 14: Surface Topology Functions

**Files:**
- Create: `src/visualizers/surfaces.ts`
- Test: `src/visualizers/__tests__/surfaces.test.ts`

- [ ] **Step 1: Write surface function tests**

```typescript
// src/visualizers/__tests__/surfaces.test.ts
import { describe, it, expect } from 'vitest'
import { kleinBottle, torus, evaluateSurface, TOPOLOGY_INFO } from '../surfaces'

describe('surfaces', () => {
  it('kleinBottle returns valid coordinates', () => {
    const p = kleinBottle(0, 0)
    expect(typeof p.x).toBe('number')
    expect(typeof p.y).toBe('number')
    expect(typeof p.z).toBe('number')
    expect(Number.isFinite(p.x)).toBe(true)
  })

  it('torus returns valid coordinates', () => {
    const p = torus(Math.PI, Math.PI)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
    expect(Number.isFinite(p.z)).toBe(true)
  })

  it('evaluateSurface morphs between topologies', () => {
    // topology parameter: 0–800 continuous. Each 100 = one topology.
    // 0 = pure Klein, 100 = pure Figure8, 50 = 50% blend between them.
    // Same as prototype's topoS slider (0–800 for 9 topologies).
    const a = evaluateSurface(1, 1, 0)    // pure kleinBottle
    const b = evaluateSurface(1, 1, 100)  // pure figure8
    const mid = evaluateSurface(1, 1, 50) // 50% blend
    // mid should be between a and b
    expect(mid.x).toBeCloseTo((a.x + b.x) / 2, 0)
  })

  it('has 9 topology infos', () => {
    expect(TOPOLOGY_INFO).toHaveLength(9)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/visualizers/__tests__/surfaces.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement surfaces.ts**

Port all 9 topology functions from prototype (lines 212-223 of klein-bottle-v4.html). Export each function individually plus `evaluateSurface(u, v, topology)` with smoothstep morphing and `TOPOLOGY_INFO` array.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/visualizers/__tests__/surfaces.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/visualizers/surfaces.ts src/visualizers/__tests__/
git commit -m "feat: 9 parametric surface topology functions with morphing"
```

---

### Task 15: MaterialFactory + FresnelMaterial

**Files:**
- Create: `src/scene/MaterialFactory.ts`
- Create: `src/scene/FresnelMaterial.ts`

- [ ] **Step 1: Implement MaterialFactory**

Port all 8 styles from prototype (lines 198-206). Export:
- `STYLES: Record<string, StylePreset>` — the 8 presets
- `createMainMaterial(style)` → `MeshStandardMaterial`
- `createWireMaterial(style)` → `MeshBasicMaterial`
- `createInnerMaterial(style)` → `MeshStandardMaterial (BackSide)`
- `createParticleMaterial(style)` → `PointsMaterial`

- [ ] **Step 2: Implement FresnelMaterial**

Port Fresnel shader from prototype (lines 360-363). Export:
- `createFresnelMaterial()` → `ShaderMaterial` with uniforms for strength, color, opacity

- [ ] **Step 3: Commit**

```bash
git add src/scene/MaterialFactory.ts src/scene/FresnelMaterial.ts
git commit -m "feat: 8 material styles + fresnel glow shader"
```

---

### Task 16: SceneManager

**Files:**
- Create: `src/scene/SceneManager.ts`
- Create: `src/scene/index.ts`

- [ ] **Step 1: Implement SceneManager**

Sets up the complete Three.js scene. Port from prototype lines 298-312.

Export `createSceneManager(canvas: HTMLCanvasElement)` returning:
- `scene`, `camera`, `renderer`
- `cubeCamera`, `cubeRenderTarget`
- `lights` object (key, fill, rim, warm, beat)
- `resize(w, h)` handler
- `update(dt, patchbay)` — camera movement, light modulation, fog, FOV
- `renderTarget` for post-FX
- `kGroup` (main group for visualizer meshes)
- `clippingPlane`

Key: all temporaries (Vector3, Color, HSL object) as module-level variables.

- [ ] **Step 2: Create scene barrel export**

```typescript
// src/scene/index.ts
export { createSceneManager } from './SceneManager'
export { STYLES, createMainMaterial, createWireMaterial, createInnerMaterial, createParticleMaterial } from './MaterialFactory'
export { createFresnelMaterial } from './FresnelMaterial'
```

- [ ] **Step 3: Commit**

```bash
git add src/scene/
git commit -m "feat: scene manager with lighting rig and camera control"
```

---

### Task 17: ParametricSurface Visualizer

**Files:**
- Create: `src/visualizers/ParametricSurface.ts`
- Create: `src/visualizers/index.ts`

- [ ] **Step 1: Implement ParametricSurface**

This is the primary visualizer, porting the prototype's main rendering. Implements the `Visualizer` interface.

Phase 1 approach: start with CPU-based geometry (like prototype) to get it working, then optimize to GPU vertex shader in a later task. This avoids blocking progress on shader porting.

Key implementation:
- `createParametricSurface()` → Visualizer
- `init(context)`: creates main mesh, wireframe, inner, fresnel, particles in kGroup
- `update(dt, patchbay)`: displacement, color modulation, topology changes (throttled)
- `rebuild()`: full geometry rebuild from `createSurfaceGeometry()`
- `dispose()`: cleanup all geometries and materials
- `params`: topology, segU, segV, scale, rotation
- `toggles`: wireframe, autoRotation, pulsation, particles, clipPlane, innerSide, fresnelGlow, spectrumRing
- Destinations: all geometry, color, material destinations from spec

Port `cG()` function from prototype line 224-226 as `createSurfaceGeometry()`.
Port displacement logic from prototype lines 537-542.
Port color modulation from prototype lines 545-548.

- [ ] **Step 2: Create visualizer barrel export**

```typescript
// src/visualizers/index.ts
export { createParametricSurface } from './ParametricSurface'
```

- [ ] **Step 3: Commit**

```bash
git add src/visualizers/ParametricSurface.ts src/visualizers/index.ts
git commit -m "feat: parametric surface visualizer with 9 topologies"
```

---

### Task 18: First Visual Output — Wiring main.ts

**Files:**
- Modify: `src/main.ts`
- Create: `src/app.ts`
- Create: `src/ui/styles.css`

- [ ] **Step 1: Create styles.css**

Extract the complete CSS from prototype (lines 7-118 of klein-bottle-v4.html). Adapt selectors where needed for the new HTML structure. Keep all custom properties, fonts, and component styles identical.

- [ ] **Step 2: Implement minimal app.ts**

```typescript
// src/app.ts — minimal version to get first render working
// Wire: clock → audioAnalyser → lfos → envelopes → patchbay → visualizer → scene → render
// No UI yet, just the render loop
```

- [ ] **Step 3: Update main.ts with bootstrap**

Follow the bootstrap sequence from spec Section 8b. For now, skip UI rendering — just init core, audio, modular, scene, visualizer, and start the render loop.

- [ ] **Step 4: Verify first visual**

Run: `pnpm dev`
Expected: Klein Bottle visible at https://localhost:5173 with Glass style, auto-rotation, Fresnel glow. No panel yet.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/app.ts src/ui/styles.css index.html
git commit -m "feat: first visual output — Klein Bottle rendering"
```

---

## Chunk 5: Post-FX Chain

This chunk produces: the FX pipeline with all 25 passes.

### Task 19: FXChain Core

**Files:**
- Create: `src/postfx/FXChain.ts`
- Create: `src/postfx/passes/BasePass.ts`
- Create: `src/postfx/index.ts`

- [ ] **Step 1: Implement BasePass helper**

A base factory that handles common FXPass boilerplate: creating a fullscreen quad, managing a ShaderMaterial, and the standard render-to-target flow.

```typescript
// src/postfx/passes/BasePass.ts
// createBasePass(id, label, order, fragmentShader, params) → FXPass
// Handles: quad creation, uniform management, render(), resize(), dispose()
// Individual passes only need to provide: fragment shader + params definition
```

- [ ] **Step 2: Implement FXChain**

```typescript
// src/postfx/FXChain.ts
// createFXChain(renderer, width, height) → FXChain
// Manages: ordered pass list, ping-pong RTs, render pipeline
// fxChain.addPass(pass)
// fxChain.render(renderer, scene, camera) — full pipeline
// fxChain.getParams() — all params from all passes for Patchbay registration
// fxChain.resize(w, h)
```

- [ ] **Step 3: Commit**

```bash
git add src/postfx/
git commit -m "feat: FX chain with ping-pong render targets"
```

---

### Task 20: Core FX Passes (Bloom, ChromAb, Grain, Vignette)

**Files:**
- Create: `src/postfx/passes/BloomPass.ts`
- Create: `src/postfx/passes/ChromaticAbPass.ts`
- Create: `src/postfx/passes/GrainPass.ts`
- Create: `src/postfx/passes/VignettePass.ts`

- [ ] **Step 1: Implement all 4 core passes**

Port shader code from prototype (lines 324-354). BloomPass gets upgraded to separable Gaussian blur on half-res targets (2 extra internal passes).

Each pass uses `createBasePass()` and only defines its fragment shader + params.

- [ ] **Step 2: Wire into FXChain and test visually**

Add passes to FXChain in main.ts. Verify Bloom, ChromAb, Grain, Vignette all work.

Run: `pnpm dev`
Expected: Post-FX visible on Klein Bottle

- [ ] **Step 3: Commit**

```bash
git add src/postfx/passes/BloomPass.ts src/postfx/passes/ChromaticAbPass.ts src/postfx/passes/GrainPass.ts src/postfx/passes/VignettePass.ts
git commit -m "feat: core post-fx passes (bloom, chromab, grain, vignette)"
```

---

### Task 21: Distortion Passes (Glitch, PixelSort, Datamosh, BitCrush)

**Files:**
- Create: `src/postfx/passes/GlitchPass.ts`
- Create: `src/postfx/passes/PixelSortPass.ts`
- Create: `src/postfx/passes/DatamoshPass.ts`
- Create: `src/postfx/passes/BitCrushPass.ts`

- [ ] **Step 1: Implement all 4 distortion passes**

Each pass: GLSL fragment shader implementing the effect + params from spec.
- GlitchPass: block displacement, RGB split, scanlines. Beat-triggerable.
- PixelSortPass: brightness-threshold directional pixel shifting.
- DatamoshPass: frame blending with previous frame (own RT).
- BitCrushPass: color quantization + resolution reduction.

- [ ] **Step 2: Test visually and commit**

```bash
git add src/postfx/passes/GlitchPass.ts src/postfx/passes/PixelSortPass.ts src/postfx/passes/DatamoshPass.ts src/postfx/passes/BitCrushPass.ts
git commit -m "feat: distortion FX passes (glitch, pixelsort, datamosh, bitcrush)"
```

---

### Task 22: Feedback/Time Passes (Feedback, MotionBlur, Echo)

**Files:**
- Create: `src/postfx/passes/FeedbackPass.ts`
- Create: `src/postfx/passes/MotionBlurPass.ts`
- Create: `src/postfx/passes/EchoPass.ts`

- [ ] **Step 1: Implement all 3 passes**

- FeedbackPass: ping-pong RT, zoom/rotate/hueShift per frame.
- MotionBlurPass: accumulation buffer blend.
- EchoPass: ring-buffer of N half-res RTs (2-8), decay blend.

- [ ] **Step 2: Test visually and commit**

```bash
git add src/postfx/passes/FeedbackPass.ts src/postfx/passes/MotionBlurPass.ts src/postfx/passes/EchoPass.ts
git commit -m "feat: feedback/time FX passes (feedback, motionblur, echo)"
```

---

### Task 23: Optical Passes (DOF, LensDistort, Anamorphic, Kaleidoscope, Mirror)

**Files:**
- Create: `src/postfx/passes/DOFPass.ts`
- Create: `src/postfx/passes/LensDistortPass.ts`
- Create: `src/postfx/passes/AnamorphicPass.ts`
- Create: `src/postfx/passes/KaleidoscopePass.ts`
- Create: `src/postfx/passes/MirrorPass.ts`

- [ ] **Step 1: Implement all 5 passes**

- DOFPass: depth-based blur (reads depth buffer, configurable focal distance).
- LensDistortPass: barrel/pincushion UV distortion.
- AnamorphicPass: horizontal-only blur on brightness extract.
- KaleidoscopePass: N-fold UV symmetry remapping.
- MirrorPass: axis-based UV flip.

- [ ] **Step 2: Test visually and commit**

```bash
git add src/postfx/passes/DOFPass.ts src/postfx/passes/LensDistortPass.ts src/postfx/passes/AnamorphicPass.ts src/postfx/passes/KaleidoscopePass.ts src/postfx/passes/MirrorPass.ts
git commit -m "feat: optical FX passes (dof, lens, anamorphic, kaleidoscope, mirror)"
```

---

### Task 24: Color Grading Passes

**Files:**
- Create: `src/postfx/passes/ColorGradePass.ts`
- Create: `src/postfx/passes/InvertPass.ts`
- Create: `src/postfx/passes/DuotonePass.ts`
- Create: `src/postfx/passes/HueRotatePass.ts`
- Create: `src/postfx/passes/MonochromePass.ts`

- [ ] **Step 1: Implement all 5 color passes**

- ColorGradePass: LUT-based (generate 16^3 3D textures procedurally for each look).
- InvertPass: simple `1.0 - color` blend.
- DuotonePass: luminance → shadow/highlight color mapping.
- HueRotatePass: HSV rotation in fragment shader.
- MonochromePass: desaturate + tint.

- [ ] **Step 2: Test visually and commit**

```bash
git add src/postfx/passes/ColorGradePass.ts src/postfx/passes/InvertPass.ts src/postfx/passes/DuotonePass.ts src/postfx/passes/HueRotatePass.ts src/postfx/passes/MonochromePass.ts
git commit -m "feat: color grading FX passes"
```

---

### Task 25: Stylization Passes (Halftone, EdgeDetect, ASCII, CRT)

**Files:**
- Create: `src/postfx/passes/HalftonePass.ts`
- Create: `src/postfx/passes/EdgeDetectPass.ts`
- Create: `src/postfx/passes/ASCIIPass.ts`
- Create: `src/postfx/passes/CRTPass.ts`

- [ ] **Step 1: Implement all 4 stylization passes**

- HalftonePass: CMYK dot pattern based on luminance.
- EdgeDetectPass: Sobel edge detection + glow.
- ASCIIPass: font atlas texture, brightness-to-character lookup.
- CRTPass: scanlines + phosphor RGB + barrel curvature.

- [ ] **Step 2: Register all 25 passes in FXChain, test visually, and commit**

```bash
git add src/postfx/passes/HalftonePass.ts src/postfx/passes/EdgeDetectPass.ts src/postfx/passes/ASCIIPass.ts src/postfx/passes/CRTPass.ts
git commit -m "feat: stylization FX passes (halftone, edge, ascii, crt)"
```

---

## Chunk 6: State Layer

State must exist before UI so components can bind to it.

### Task 26: Zustand Store

**Files:**
- Create: `src/state/store.ts`
- Create: `src/state/presets.ts`
- Create: `src/state/index.ts`

- [ ] **Step 1: Implement store with all state slices and actions**

Follow spec Section 8 interface. All slices: activeVisualizer, vizParams, vizToggles, style, patches, lfos, envelopes, macros, audioGain, audioSmoothing, beatSensitivity, fxParams, fxEnabled, panelOpen, activeTab.

Actions: setActiveVisualizer, setVizParam, setVizToggle, setPatch, setLFO, setEnvelope, setMacro, setFXParam, setFXEnabled, etc.

- [ ] **Step 2: Implement preset system**

- `serializePreset(store) → SynoptikPreset`
- `deserializePreset(preset) → void`
- `FACTORY_PRESETS` — port 5 presets from prototype + create presets for new visualizers as they're added
- `savePreset`, `loadPreset`, `deletePreset` — localStorage `synoptik_presets`
- `encodePresetURL(preset)` / `decodePresetURL(hash)` — lz-string compress → base64url
- `randomize()` — random visualizer, params, patches, LFOs, FX
- `migratePreset(old)` — handle `pres` → `presence` etc.

- [ ] **Step 3: Commit**

```bash
git add src/state/
git commit -m "feat: zustand store and preset system"
```

---

## Chunk 7: UI Layer

This chunk produces: the full panel UI with all 6 tabs, controls, and keyboard shortcuts.

### Task 26: UI Controls (Slider, Toggle, Select, Button, Knob)

**Files:**
- Create: `src/ui/controls.ts`

- [ ] **Step 1: Implement reusable Preact+HTM control components**

Each control is a small Preact component using HTM template literals:
- `Slider({ label, value, min, max, onChange })` — range input with value display
- `Toggle({ label, checked, onChange })` — custom toggle switch
- `Select({ label, value, options, onChange })` — dropdown
- `Button({ label, active, onClick })` — styled button
- `Knob({ label, value, onChange })` — canvas-rendered rotary knob for Macros
- `Section({ title, children })` — collapsible section header
- `MeterBar({ value, label })` — vertical meter bar

Style classes match prototype CSS exactly.

- [ ] **Step 2: Commit**

```bash
git add src/ui/controls.ts
git commit -m "feat: reusable UI control components"
```

---

### Task 27: Panel + Tabs

**Files:**
- Create: `src/ui/Panel.ts`

- [ ] **Step 1: Implement Panel component**

Main panel container with tab navigation. Port from prototype (lines 20-31 CSS, lines 124-131 HTML).

- 6 tabs: Viz, Form, Patch, LFO, Audio, FX
- Slide-in/out from right (340px)
- Hamburger toggle button
- Tab switching via click and keyboard (Tab key)

- [ ] **Step 2: Commit**

```bash
git add src/ui/Panel.ts
git commit -m "feat: panel component with tab navigation"
```

---

### Task 28: All Tab Components

**Files:**
- Create: `src/ui/VizTab.ts`
- Create: `src/ui/ShapeTab.ts`
- Create: `src/ui/PatchTab.ts`
- Create: `src/ui/LFOTab.ts`
- Create: `src/ui/AudioTab.ts`
- Create: `src/ui/FXTab.ts`

- [ ] **Step 1: Implement VizTab**

Grid of visualizer buttons categorized by type. Reads from registry.

- [ ] **Step 2: Implement ShapeTab**

Dynamic form generated from `activeVisualizer.params` and `activeVisualizer.toggles`. For ParametricSurface: topology card, style buttons, geometry sliders, effect toggles.

- [ ] **Step 3: Implement PatchTab**

Modulation matrix: grouped destinations, source dropdowns, amount sliders, activity LEDs. Expandable rows with curve buttons + lag slider. Macro section with knobs.

- [ ] **Step 4: Implement LFOTab**

4 LFO cards (waveform buttons, canvas preview, rate, depth, phase offset, retrigger toggle) + 4 Envelope cards (source dropdown, attack, release).

- [ ] **Step 5: Implement AudioTab**

Audio source buttons (Mic, Tab, File, Spotify), status line, 8 band meters, 13 analysis meters, sensitivity sliders.

- [ ] **Step 6: Implement FXTab**

Collapsible sections per FX pass, organized by category. Enable toggle + sliders per param. Preset section at bottom.

- [ ] **Step 7: Commit**

```bash
git add src/ui/VizTab.ts src/ui/ShapeTab.ts src/ui/PatchTab.ts src/ui/LFOTab.ts src/ui/AudioTab.ts src/ui/FXTab.ts
git commit -m "feat: all panel tab components"
```

---

### Task 29: SpectrumRing + Intro + Keyboard Shortcuts

**Files:**
- Create: `src/ui/SpectrumRing.ts`
- Create: `src/ui/Intro.ts`
- Create: `src/ui/Shortcuts.ts`
- Create: `src/ui/index.ts`

- [ ] **Step 1: Implement SpectrumRing**

Port from prototype lines 386-390. Canvas 2D overlay drawing spectrum as radial lines.

- [ ] **Step 2: Implement Intro screen**

"Synoptik" splash with Fraunces italic, fade-out after 2.5s.

- [ ] **Step 3: Implement keyboard shortcuts**

All shortcuts from spec: P, W, Space, F, M, R, S, 1-9, Tab, Esc.

- [ ] **Step 4: Create UI barrel export**

- [ ] **Step 5: Commit**

```bash
git add src/ui/
git commit -m "feat: spectrum ring, intro screen, keyboard shortcuts"
```

---

## Chunk 8: Full Integration

This chunk produces: complete app wiring. After this, the app is feature-complete for the Parametric Surface visualizer.

### Task 32: Full App Wiring

**Files:**
- Modify: `src/main.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Complete main.ts bootstrap**

Full 10-step bootstrap from spec Section 8b. Wire everything: core → input → modular → scene → visualizer → postfx → ui → state.

- [ ] **Step 2: Complete app.ts animate loop**

Full frame update sequence. Spotify callback handling. Resize handler. Pause/resume.

- [ ] **Step 3: Verify full integration**

Run: `pnpm dev`
Expected: Complete working app with Panel, Audio input, Modulation, Post-FX, Presets.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/app.ts
git commit -m "feat: complete app wiring and bootstrap"
```

---

## Chunk 9: Additional 3D Visualizers

Each visualizer follows the established `Visualizer` interface pattern. Implement one at a time.

### Task 33: ParticleField Visualizer

**Files:**
- Create: `src/visualizers/ParticleField.ts`

GPU-instanced particles (InstancedBufferGeometry). Vertex shader handles position updates. Up to 500k particles.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/ParticleField.ts
git commit -m "feat: particle field visualizer (GPU instanced, 500k)"
```

---

### Task 34: Tunnel Visualizer

**Files:**
- Create: `src/visualizers/Tunnel.ts`

Instanced rings, camera moves along Z. Audio pulses ring radius and twist.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/Tunnel.ts
git commit -m "feat: tunnel visualizer"
```

---

### Task 35: Terrain Visualizer

**Files:**
- Create: `src/visualizers/Terrain.ts`

PlaneGeometry with noise + audio heightmap in vertex shader. Camera flies forward.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/Terrain.ts
git commit -m "feat: terrain visualizer"
```

---

### Task 36: Fractal3D Visualizer

**Files:**
- Create: `src/visualizers/Fractal3D.ts`

Fullscreen quad + raymarching fragment shader. Mandelbulb distance estimator.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/Fractal3D.ts
git commit -m "feat: fractal 3D visualizer (mandelbulb raymarching)"
```

---

### Task 37: WireGlobe Visualizer

**Files:**
- Create: `src/visualizers/WireGlobe.ts`

IcosphereGeometry as LineSegments with vertex displacement.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/WireGlobe.ts
git commit -m "feat: wire globe visualizer"
```

---

## Chunk 10: 2D Visualizers

### Task 38: Waveform Visualizer

**Files:**
- Create: `src/visualizers/Waveform.ts`

Canvas 2D or WebGL line shader. Reads timeDomainData. Glow, multi-layer, mirror options.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/Waveform.ts
git commit -m "feat: waveform visualizer"
```

---

### Task 39: SpectrumBars Visualizer

**Files:**
- Create: `src/visualizers/SpectrumBars.ts`

Instanced quads or Canvas 2D. Linear, radial, mirrored layouts.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/SpectrumBars.ts
git commit -m "feat: spectrum bars visualizer"
```

---

### Task 40: ShaderArt Visualizer

**Files:**
- Create: `src/visualizers/ShaderArt.ts`

Fullscreen fragment shader with multiple pattern subroutines (voronoi, plasma, fractal flames, reaction diffusion). Audio uniforms.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/ShaderArt.ts
git commit -m "feat: shader art visualizer (voronoi, plasma, fractals)"
```

---

### Task 41: Lissajous Visualizer

**Files:**
- Create: `src/visualizers/Lissajous.ts`

Canvas 2D XY-scope. TimeDomainData for X/Y or LFO-driven. Trail with fade.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/Lissajous.ts
git commit -m "feat: lissajous visualizer"
```

---

### Task 42: CircularWaveform Visualizer

**Files:**
- Create: `src/visualizers/CircularWaveform.ts`

Waveform rendered in polar coordinates. Canvas 2D or WebGL.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

```bash
git add src/visualizers/CircularWaveform.ts
git commit -m "feat: circular waveform visualizer"
```

---

### Task 43: FluidSim Visualizer

**Files:**
- Create: `src/visualizers/FluidSim.ts`

GPGPU ping-pong textures for velocity + density. Navier-Stokes approximation. Audio injects forces.

- [ ] **Step 1: Implement, register in registry, test visually, commit**

Note: This is the most complex visualizer. GPGPU requires ping-pong float textures for velocity + density fields, a divergence solver, pressure solver, and advection step. Use Three.js `WebGLRenderTarget` with `FloatType` for the simulation textures. Audio forces inject velocity at the center of the screen.

```bash
git add src/visualizers/FluidSim.ts
git commit -m "feat: fluid simulation visualizer (GPGPU)"
```

---

## Chunk 11: GPU Optimization + Polish

### Task 44: GPU Vertex Shader for Parametric Surface

**Files:**
- Create: `src/visualizers/SurfaceShaderMaterial.ts`
- Modify: `src/visualizers/ParametricSurface.ts`

- [ ] **Step 1: Port all 9 topology functions to GLSL**

Create a custom ShaderMaterial that computes topology positions + morphing + displacement in the vertex shader. Replace the CPU displacement loop.

- [ ] **Step 2: Integrate into ParametricSurface, verify visual parity with CPU version**

- [ ] **Step 3: Benchmark: verify 100k+ vertices at 60fps**

- [ ] **Step 4: Commit**

```bash
git commit -m "perf: GPU vertex shader for parametric surfaces"
```

---

### Task 45: Factory Presets for All Visualizers

**Files:**
- Modify: `src/state/presets.ts`

- [ ] **Step 1: Create at least 2 factory presets per visualizer**

Parametric Surface: Ambient Glass, Neon Pulse, Alien Morph, Vapor Dream, Glitch Box (from prototype)
ParticleField: Star Field, Audio Storm
Tunnel: Bass Tunnel, Hyperspace
Terrain: Flyover, Earthquake
Fractal3D: Mandelbulb Pulse, Alien Core
WireGlobe: Classic Globe, Shatter
Waveform: Classic Scope, Neon Wave
SpectrumBars: Club Mode, Radial Spectrum
ShaderArt: Plasma Flow, Voronoi Beat
Lissajous: Clean Scope, Rainbow Trail
CircularWaveform: Heartbeat, Spiral
FluidSim: Ink Drop, Audio Fluid

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: factory presets for all visualizers"
```

---

### Task 46: Final Integration Test

- [ ] **Step 1: Full manual test checklist**

```
[ ] App loads without errors
[ ] Intro screen shows and fades
[ ] Panel opens/closes with P key
[ ] All 6 tabs render correctly
[ ] Visualizer switching works with crossfade
[ ] All 12 visualizers render
[ ] Audio: Mic input works
[ ] Audio: Tab capture works
[ ] Audio: File drag-and-drop works
[ ] Audio: Spotify connect works
[ ] Audio meters respond to input
[ ] LFOs animate and modulate
[ ] Envelopes follow audio
[ ] Macros bind to destinations
[ ] Patchbay: all curves work (linear, exp, log, step)
[ ] Patchbay: lag/slew smooths values
[ ] All 25 FX passes activate and render
[ ] Preset save/load works
[ ] Factory presets load correctly
[ ] Random works
[ ] URL sharing works
[ ] Keyboard shortcuts all function
[ ] Spectrum ring overlay works
[ ] Resize handles correctly
[ ] 60fps on mid-range hardware with Parametric Surface + 3 FX passes
[ ] No console errors during normal operation
```

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: synoptik v1.0 — complete modular music visualizer"
```
