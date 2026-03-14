import { h } from 'preact'
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

export interface LFOTabProps {
  lfos: Array<{ rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }>
  envelopes: Array<{ source: string; attack: number; release: number }>
  onLFO: (index: number, update: Partial<{ rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }>) => void
  onEnvelope: (index: number, update: Partial<{ source: string; attack: number; release: number }>) => void
}

function LFOCard({ index, lfo, onUpdate }: {
  index: number
  lfo: { rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }
  onUpdate: (index: number, update: Partial<{ rate: number; waveform: string; depth: number; phaseOffset: number; retriggerOnBeat: boolean }>) => void
}) {
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

export function LFOTab({ lfos, envelopes, onLFO, onEnvelope }: LFOTabProps) {
  return html`
    <div class="tc active">
      <${Section} title="LFOs" />
      ${lfos.map((lfo, i) => html`
        <${LFOCard} index=${i} lfo=${lfo} onUpdate=${onLFO} />
      `)}

      <${Section} title="Envelope Follower" />
      ${envelopes.map((env, i) => html`
        <${EnvelopeCard} index=${i} env=${env} onUpdate=${onEnvelope} />
      `)}
    </div>
  `
}
