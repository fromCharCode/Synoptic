import { h } from 'preact'
import htm from 'htm'
import type { Destination, CurveType } from '@core/types'
import { Section } from './controls'

const html = htm.bind(h)

// Source options grouped
const SOURCE_OPTIONS: Array<{ value: string; label: string; group: string }> = [
  { value: 'none', label: 'Off', group: 'Off' },
  // Bands
  { value: 'sub', label: 'Sub', group: 'Bands' },
  { value: 'bass', label: 'Bass', group: 'Bands' },
  { value: 'lowmid', label: 'Low Mid', group: 'Bands' },
  { value: 'mid', label: 'Mid', group: 'Bands' },
  { value: 'himid', label: 'Hi Mid', group: 'Bands' },
  { value: 'high', label: 'High', group: 'Bands' },
  { value: 'presence', label: 'Presence', group: 'Bands' },
  { value: 'air', label: 'Air', group: 'Bands' },
  // Analysis
  { value: 'energy', label: 'Energy', group: 'Analysis' },
  { value: 'peak', label: 'Peak', group: 'Analysis' },
  { value: 'rms', label: 'RMS', group: 'Analysis' },
  { value: 'centroid', label: 'Centroid', group: 'Analysis' },
  { value: 'flux', label: 'Flux', group: 'Analysis' },
  // Extended
  { value: 'spread', label: 'Spread', group: 'Extended' },
  { value: 'zcr', label: 'ZCR', group: 'Extended' },
  { value: 'crest', label: 'Crest', group: 'Extended' },
  { value: 'beat', label: 'Beat', group: 'Extended' },
  { value: 'onset', label: 'Onset', group: 'Extended' },
  { value: 'rolloff', label: 'Rolloff', group: 'Extended' },
  { value: 'loudness', label: 'Loudness', group: 'Extended' },
  { value: 'bassRatio', label: 'Bass Ratio', group: 'Extended' },
  // LFOs
  { value: 'lfo1', label: 'LFO 1', group: 'LFOs' },
  { value: 'lfo2', label: 'LFO 2', group: 'LFOs' },
  { value: 'lfo3', label: 'LFO 3', group: 'LFOs' },
  { value: 'lfo4', label: 'LFO 4', group: 'LFOs' },
  // Envelopes
  { value: 'env1', label: 'Env 1', group: 'Envelopes' },
  { value: 'env2', label: 'Env 2', group: 'Envelopes' },
  { value: 'env3', label: 'Env 3', group: 'Envelopes' },
  { value: 'env4', label: 'Env 4', group: 'Envelopes' },
  // Macros
  { value: 'macro1', label: 'Macro 1', group: 'Macros' },
  { value: 'macro2', label: 'Macro 2', group: 'Macros' },
  { value: 'macro3', label: 'Macro 3', group: 'Macros' },
  { value: 'macro4', label: 'Macro 4', group: 'Macros' },
]

// Group source options for optgroups
const SOURCE_GROUPS = new Map<string, Array<{ value: string; label: string }>>()
for (const opt of SOURCE_OPTIONS) {
  if (!SOURCE_GROUPS.has(opt.group)) SOURCE_GROUPS.set(opt.group, [])
  SOURCE_GROUPS.get(opt.group)!.push(opt)
}

export interface PatchTabProps {
  destinations: Destination[]
  patches: Record<string, { source: string; amount: number; curve: CurveType; lag: number }>
  onPatch: (destId: string, source: string, amount: number, curve: CurveType, lag: number) => void
  onClearPatch: (destId: string) => void
}

function PatchRow({ dest, patch, onPatch, onClearPatch }: {
  dest: Destination
  patch: { source: string; amount: number; curve: CurveType; lag: number } | undefined
  onPatch: (destId: string, source: string, amount: number, curve: CurveType, lag: number) => void
  onClearPatch: (destId: string) => void
}) {
  const source = patch?.source ?? 'none'
  const amount = patch?.amount ?? 0
  const isActive = source !== 'none' && amount !== 0

  return html`
    <div class="pr ${isActive ? 'ac' : ''}" data-c=${String(dest.colorIndex)}>
      <div class="pl">${dest.label}</div>
      <select class="ps" value=${source}
        onChange=${(e: Event) => {
          const newSource = (e.target as HTMLSelectElement).value
          if (newSource === 'none') {
            onClearPatch(dest.id)
          } else {
            onPatch(dest.id, newSource, amount || 50, patch?.curve ?? 'linear', patch?.lag ?? 0)
          }
        }}>
        ${[...SOURCE_GROUPS.entries()].map(([group, opts]) =>
          html`<optgroup label=${group}>${opts.map(o =>
            html`<option value=${o.value} selected=${o.value === source}>${o.label}</option>`
          )}</optgroup>`
        )}
      </select>
      <input type="range" class="pa" min=${-100} max=${100} value=${amount}
        onInput=${(e: Event) => {
          const v = Number((e.target as HTMLInputElement).value)
          if (source !== 'none') {
            onPatch(dest.id, source, v, patch?.curve ?? 'linear', patch?.lag ?? 0)
          }
        }} />
      <div class="vu ${isActive ? 'lit' : ''}"></div>
    </div>
  `
}

export function PatchTab({ destinations, patches, onPatch, onClearPatch }: PatchTabProps) {
  // Group destinations by group
  const groups = new Map<string, Destination[]>()
  for (const dest of destinations) {
    if (!groups.has(dest.group)) groups.set(dest.group, [])
    groups.get(dest.group)!.push(dest)
  }

  // Sort: non-FX groups first, then FX groups at the bottom
  const sortedEntries = [...groups.entries()].sort((a, b) => {
    const aIsFX = a[0].startsWith('FX:') || a[0] === 'Post-FX'
    const bIsFX = b[0].startsWith('FX:') || b[0] === 'Post-FX'
    if (aIsFX && !bIsFX) return 1
    if (!aIsFX && bIsFX) return -1
    return 0
  })

  return html`
    <div class="tc active">
      ${sortedEntries.map(([group, dests]) => html`
        <${Section} title=${group} />
        ${dests.map(dest => html`
          <${PatchRow}
            dest=${dest}
            patch=${patches[dest.id]}
            onPatch=${onPatch}
            onClearPatch=${onClearPatch}
          />
        `)}
      `)}
    </div>
  `
}
