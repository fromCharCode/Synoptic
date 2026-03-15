import { h } from 'preact'
import { useRef, useEffect } from 'preact/hooks'
import htm from 'htm'
import type { Waveform } from '@core/types'
import { Section, Slider, Toggle } from './controls'

const html = htm.bind(h)

const WAVEFORMS: Array<{ id: Waveform; label: string }> = [
  { id: 'sin', label: 'SIN' },
  { id: 'tri', label: 'TRI' },
  { id: 'saw', label: 'SAW' },
  { id: 'sqr', label: 'SQR' },
  { id: 's&h', label: 'S&H' },
]

const ENV_SOURCES: Array<{ value: string; label: string }> = [
  { value: 'sub', label: 'Sub' },
  { value: 'bass', label: 'Bass' },
  { value: 'lowmid', label: 'Low Mid' },
  { value: 'mid', label: 'Mid' },
  { value: 'himid', label: 'Hi Mid' },
  { value: 'high', label: 'High' },
  { value: 'presence', label: 'Presence' },
  { value: 'air', label: 'Air' },
  { value: 'energy', label: 'Energy' },
  { value: 'rms', label: 'RMS' },
]

const LFO_COLORS = ['#5ce0d6', '#f472b6', '#a78bfa', '#fbbf24']

function computeWaveform(waveform: string, p: number): number {
  switch (waveform) {
    case 'sin': return Math.sin(p * Math.PI * 2) * 0.5 + 0.5
    case 'tri': return p < 0.5 ? p * 2 : (1 - p) * 2
    case 'saw': return p
    case 'sqr': return p < 0.5 ? 1 : 0
    case 's&h': return 0.5
    default: return 0.5
  }
}

function LFOWaveformCanvas({ waveform, phase, color }: {
  waveform: string
  phase: number
  color: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = 280
    const h = 22
    canvas.width = w
    canvas.height = h

    ctx.clearRect(0, 0, w, h)

    // Draw waveform shape (3 cycles visible)
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    const cycles = 3
    for (let x = 0; x < w; x++) {
      const p = (x / w * cycles) % 1
      const y = (1 - computeWaveform(waveform, p)) * (h - 2) + 1
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Draw phase indicator (vertical line)
    const phaseX = (phase % 1) * (w / cycles)
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8
    ctx.moveTo(phaseX, 0)
    ctx.lineTo(phaseX, h)
    ctx.stroke()
    ctx.globalAlpha = 1
  }, [waveform, phase, color])

  return html`<canvas ref=${canvasRef} width=${280} height=${22}
    style="width:100%;height:22px;border-radius:4px;background:rgba(255,255,255,0.03);margin:4px 0" />`
}

export interface LFOTabProps {
  lfos: Array<{ rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }>
  envelopes: Array<{ source: string; attack: number; release: number }>
  lfoPhases: number[]
  onLFO: (index: number, update: Partial<{ rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }>) => void
  onEnvelope: (index: number, update: Partial<{ source: string; attack: number; release: number }>) => void
}

function LFOCard({ index, lfo, phase, onUpdate }: {
  index: number
  lfo: { rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }
  phase: number
  onUpdate: (index: number, update: Partial<{ rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }>) => void
}) {
  const color = LFO_COLORS[index] ?? LFO_COLORS[0]!

  return html`
    <div class="lc">
      <div class="lh">
        <div class="lt" style="color:var(--a3)">LFO ${index + 1}</div>
        <div class="lw">
          ${WAVEFORMS.map(w => html`
            <div class="lb ${lfo.waveform === w.id ? 'active' : ''}"
              onClick=${() => onUpdate(index, { waveform: w.id })}>${w.label}</div>
          `)}
        </div>
      </div>
      <${LFOWaveformCanvas} waveform=${lfo.waveform} phase=${phase} color=${color} />
      <${Slider} label="Rate" value=${Math.round(lfo.rate * 100)} min=${1} max=${1000}
        onChange=${(v: number) => onUpdate(index, { rate: v / 100 })} />
      <${Slider} label="Depth" value=${Math.round(lfo.depth * 100)} min=${0} max=${100}
        onChange=${(v: number) => onUpdate(index, { depth: v / 100 })} />
      <${Slider} label="Phase" value=${Math.round(lfo.phaseOffset * 360)} min=${0} max=${360}
        onChange=${(v: number) => onUpdate(index, { phaseOffset: v / 360 })} />
      <${Toggle} label="Beat Retrigger" checked=${lfo.retriggerOnBeat}
        onChange=${(v: boolean) => onUpdate(index, { retriggerOnBeat: v })} />
    </div>
  `
}

function EnvelopeCard({ index, env, onUpdate }: {
  index: number
  env: { source: string; attack: number; release: number }
  onUpdate: (index: number, update: Partial<{ source: string; attack: number; release: number }>) => void
}) {
  return html`
    <div class="lc">
      <div class="lh">
        <div class="lt" style="color:var(--a5)">ENV ${index + 1}</div>
        <select class="ps" value=${env.source}
          onChange=${(e: Event) => onUpdate(index, { source: (e.target as HTMLSelectElement).value })}>
          ${ENV_SOURCES.map(s => html`
            <option value=${s.value} selected=${s.value === env.source}>${s.label}</option>
          `)}
        </select>
      </div>
      <${Slider} label="Attack" value=${Math.round(env.attack * 1000)} min=${1} max=${200}
        onChange=${(v: number) => onUpdate(index, { attack: v / 1000 })} />
      <${Slider} label="Release" value=${Math.round(env.release * 1000)} min=${10} max=${2000}
        onChange=${(v: number) => onUpdate(index, { release: v / 1000 })} />
    </div>
  `
}

export function LFOTab({ lfos, envelopes, lfoPhases, onLFO, onEnvelope }: LFOTabProps) {
  return html`
    <div class="tc active">
      <${Section} title="LFOs" />
      ${lfos.map((lfo, i) => html`
        <${LFOCard} index=${i} lfo=${lfo} phase=${lfoPhases[i] ?? 0} onUpdate=${onLFO} />
      `)}

      <${Section} title="Envelope Follower" />
      ${envelopes.map((env, i) => html`
        <${EnvelopeCard} index=${i} env=${env} onUpdate=${onEnvelope} />
      `)}
    </div>
  `
}
