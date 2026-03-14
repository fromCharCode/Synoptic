import { h } from 'preact'
import htm from 'htm'
import type { FXPass } from '@core/types'
import { Section, Slider, Toggle, PresetButton } from './controls'

const html = htm.bind(h)

// Group passes by their param group prefix
const FX_CATEGORIES: Array<{ label: string; passIds: string[] }> = [
  { label: 'Core', passIds: ['bloom', 'chrom', 'grain', 'vig'] },
  { label: 'Distortion', passIds: ['glitch', 'pixelsort', 'datamosh', 'bitcrush'] },
  { label: 'Feedback / Zeit', passIds: ['feedback', 'motionblur', 'echo'] },
  { label: 'Optik', passIds: ['dof', 'lensdistort', 'anamorphic', 'kaleidoscope', 'mirror'] },
  { label: 'Farbe', passIds: ['colorgrade', 'invert', 'duotone', 'huerotate', 'monochrome'] },
  { label: 'Stilisierung', passIds: ['halftone', 'edgedetect', 'ascii', 'crt'] },
]

export interface FXTabProps {
  passes: FXPass[]
  fxParams: Record<string, number>
  fxEnabled: Record<string, boolean>
  onFXParam: (paramId: string, value: number) => void
  onFXEnabled: (passId: string, enabled: boolean) => void
  onRandomize: () => void
  onSave: () => void
  onReset: () => void
  onLoadFactory: (name: string) => void
  factoryPresetNames: string[]
}

function FXPassCard({ pass, fxParams, fxEnabled, onFXParam, onFXEnabled }: {
  pass: FXPass
  fxParams: Record<string, number>
  fxEnabled: Record<string, boolean>
  onFXParam: (paramId: string, value: number) => void
  onFXEnabled: (passId: string, enabled: boolean) => void
}) {
  const enabled = fxEnabled[pass.id] ?? pass.enabled

  return html`
    <div class="lc" style="opacity:${enabled ? 1 : 0.5}">
      <div class="lh">
        <div class="lt">${pass.label}</div>
        <${Toggle} label="" checked=${enabled}
          onChange=${(v: boolean) => onFXEnabled(pass.id, v)} />
      </div>
      ${pass.params.map(p => {
        const value = fxParams[p.id] ?? p.value
        return html`
          <${Slider} label=${p.label} value=${value} min=${p.min} max=${p.max}
            onChange=${(v: number) => onFXParam(p.id, v)} />
        `
      })}
    </div>
  `
}

export function FXTab({
  passes, fxParams, fxEnabled,
  onFXParam, onFXEnabled,
  onRandomize, onSave, onReset, onLoadFactory, factoryPresetNames,
}: FXTabProps) {
  return html`
    <div class="tc active">
      ${FX_CATEGORIES.map(cat => {
        const catPasses = passes.filter(p => cat.passIds.includes(p.id))
        if (catPasses.length === 0) return null
        return html`
          <${Section} title=${cat.label} />
          ${catPasses.map(pass => html`
            <${FXPassCard}
              pass=${pass}
              fxParams=${fxParams}
              fxEnabled=${fxEnabled}
              onFXParam=${onFXParam}
              onFXEnabled=${onFXEnabled}
            />
          `)}
        `
      })}

      <${Section} title="Presets" />
      <div class="preset-bar">
        <${PresetButton} label="Random" variant="highlight" onClick=${onRandomize} />
        <${PresetButton} label="Speichern" onClick=${onSave} />
        <${PresetButton} label="Reset" variant="danger" onClick=${onReset} />
      </div>
      <div class="preset-bar">
        ${factoryPresetNames.map(name => html`
          <${PresetButton} label=${name} onClick=${() => onLoadFactory(name)} />
        `)}
      </div>
    </div>
  `
}
