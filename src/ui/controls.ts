import { h } from 'preact'
import htm from 'htm'

const html = htm.bind(h)

// Slider with label and value display
export function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void
}) {
  return html`
    <div class="sr">
      <label>${label}</label>
      <input type="range" min=${min} max=${max} step=${step ?? 1} value=${value}
        onInput=${(e: Event) => onChange(Number((e.target as HTMLInputElement).value))} />
      <span class="sv">${Math.round(value)}</span>
    </div>
  `
}

// Toggle switch
export function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return html`
    <div class="tr">
      <span>${label}</span>
      <div class="tg ${checked ? 'on' : ''}" onClick=${() => onChange(!checked)}></div>
    </div>
  `
}

// Style button
export function StyleButton({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void
}) {
  return html`<div class="sb ${active ? 'active' : ''}" onClick=${onClick}>${label}</div>`
}

// Section header
export function Section({ title }: { title: string }) {
  return html`<div class="sh">${title}</div>`
}

// Audio source button
export function AudioButton({ label, icon, active, onClick }: {
  label: string; icon: string; active: boolean; onClick: () => void
}) {
  return html`<button class="ab ${active ? 'active' : ''}" onClick=${onClick}><span>${icon}</span> ${label}</button>`
}

// Meter bar
export function MeterBar({ value, label }: { value: number; label: string }) {
  return html`
    <div class="mc">
      <div class="mw"><div class="mb" style="height:${Math.round(value * 100)}%"></div></div>
      <div class="ml">${label}</div>
      <div class="mvl">${Math.round(value * 100)}</div>
    </div>
  `
}

// Select dropdown
export function Select({ label, value, options, onChange }: {
  label: string; value: string
  options: Array<{ value: string; label: string; group?: string }>
  onChange: (v: string) => void
}) {
  // Group options by group field
  const groups = new Map<string, Array<{ value: string; label: string }>>()
  for (const opt of options) {
    const g = opt.group ?? ''
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(opt)
  }

  // Suppress unused label warning
  void label

  return html`
    <select class="ps" value=${value} onChange=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}>
      ${[...groups.entries()].map(([group, opts]) =>
        group
          ? html`<optgroup label=${group}>${opts.map(o => html`<option value=${o.value} selected=${o.value === value}>${o.label}</option>`)}</optgroup>`
          : opts.map(o => html`<option value=${o.value} selected=${o.value === value}>${o.label}</option>`)
      )}
    </select>
  `
}

// Preset button
export function PresetButton({ label, variant, onClick }: {
  label: string; variant?: 'highlight' | 'danger'; onClick: () => void
}) {
  const cls = variant === 'highlight' ? 'preset-btn hl' : variant === 'danger' ? 'preset-btn danger' : 'preset-btn'
  return html`<div class="${cls}" onClick=${onClick}>${label}</div>`
}
