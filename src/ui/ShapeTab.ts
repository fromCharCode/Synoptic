import { h } from 'preact'
import htm from 'htm'
import { TOPOLOGY_INFO } from '@visualizers/surfaces'
import { STYLES } from '@scene/MaterialFactory'
import type { VisualizerParam, VisualizerToggle } from '@core/types'
import { Section, Slider, StyleButton, Toggle } from './controls'

const html = htm.bind(h)

export interface ShapeTabProps {
  visualizerId: string
  params: VisualizerParam[]
  toggles: VisualizerToggle[]
  vizParams: Record<string, number>
  vizToggles: Record<string, boolean>
  style: string
  onVizParam: (key: string, value: number) => void
  onVizToggle: (key: string, value: boolean) => void
  onStyle: (id: string) => void
}

function getTopologyInfo(topology: number): { name: string; description: string } {
  const idx = Math.min(Math.floor(topology / 100), TOPOLOGY_INFO.length - 1)
  const info = TOPOLOGY_INFO[idx]
  return info ? { name: info.name, description: info.description } : { name: 'Unknown', description: '' }
}

function groupParams(params: VisualizerParam[]): Map<string, VisualizerParam[]> {
  const groups = new Map<string, VisualizerParam[]>()
  for (const p of params) {
    if (!groups.has(p.group)) groups.set(p.group, [])
    groups.get(p.group)!.push(p)
  }
  return groups
}

function renderParamControl(
  param: VisualizerParam,
  value: number,
  onVizParam: (key: string, value: number) => void,
) {
  if (param.type === 'select' && param.options) {
    const strValue = String(value)
    return html`
      <div class="sr">
        <label>${param.label}</label>
        <select class="ps"
          value=${strValue}
          onChange=${(e: Event) => onVizParam(param.id, Number((e.target as HTMLSelectElement).value))}
        >
          ${param.options.map(opt => html`
            <option value=${String(opt.value)} selected=${opt.value === value}>${opt.label}</option>
          `)}
        </select>
      </div>
    `
  }
  return html`
    <${Slider}
      label=${param.label}
      value=${value}
      min=${param.min ?? 0}
      max=${param.max ?? 100}
      step=${1}
      onChange=${(v: number) => onVizParam(param.id, v)}
    />
  `
}

export function ShapeTab({
  visualizerId,
  params,
  toggles,
  vizParams,
  vizToggles,
  style,
  onVizParam,
  onVizToggle,
  onStyle,
}: ShapeTabProps) {
  const isParametricSurface = visualizerId === 'parametricSurface'
  const topology = vizParams['topology'] ?? 0
  const topoInfo = getTopologyInfo(topology)
  const topoIndex = Math.floor(topology / 100)

  const groupedParams = groupParams(params)

  return html`
    <div class="tc active">

      ${isParametricSurface && html`
        <${Section} title="Topologie" />
        <div class="tw">
          <label>TOPOLOGIE ${topoIndex + 1}/${TOPOLOGY_INFO.length}</label>
          <div class="tn">${topoInfo.name}</div>
          <div class="td">${topoInfo.description}</div>
          <${Slider} label="Morph" value=${topology} min=${0} max=${800} step=${1}
            onChange=${(v: number) => onVizParam('topology', v)} />
          <div class="ts">
            <span>Klassisch</span>
            <span>Superformula</span>
          </div>
        </div>

        <${Section} title="Stil" />
        <div class="sg">
          ${Object.values(STYLES).map(s => html`
            <${StyleButton} label=${s.label} active=${style === s.id}
              onClick=${() => onStyle(s.id)} />
          `)}
        </div>
      `}

      ${[...groupedParams.entries()].map(([groupName, groupItems]) => html`
        <${Section} title=${groupName} />
        ${groupItems.map(param =>
          renderParamControl(param, vizParams[param.id] ?? param.default, onVizParam)
        )}
      `)}

      ${toggles.length > 0 && html`
        <${Section} title="Effekte" />
        ${toggles.map(toggle => html`
          <${Toggle}
            label=${toggle.label}
            checked=${vizToggles[toggle.id] ?? toggle.default}
            onChange=${(v: boolean) => onVizToggle(toggle.id, v)}
          />
        `)}
      `}

      <${Section} title="Farbe" />
      <${Slider} label="Hue Shift" value=${vizParams['hueShift'] ?? 0} min=${0} max=${360} step=${1}
        onChange=${(v: number) => onVizParam('hueShift', v)} />
      <${Slider} label="Sättigung" value=${vizParams['saturation'] ?? 100} min=${0} max=${200} step=${1}
        onChange=${(v: number) => onVizParam('saturation', v)} />
      <${Slider} label="Helligkeit" value=${vizParams['brightness'] ?? 100} min=${0} max=${200} step=${1}
        onChange=${(v: number) => onVizParam('brightness', v)} />
      <${Slider} label="Emissive Int." value=${vizParams['emissiveInt'] ?? 50} min=${0} max=${100} step=${1}
        onChange=${(v: number) => onVizParam('emissiveInt', v)} />
      <${Slider} label="Emissive Hue" value=${vizParams['emissiveHue'] ?? 0} min=${0} max=${360} step=${1}
        onChange=${(v: number) => onVizParam('emissiveHue', v)} />

      <${Section} title="Material" />
      <${Slider} label="Fresnel" value=${vizParams['fresnelStrength'] ?? 60} min=${0} max=${100} step=${1}
        onChange=${(v: number) => onVizParam('fresnelStrength', v)} />
      <${Slider} label="Fresnel Hue" value=${vizParams['fresnelHue'] ?? 0} min=${0} max=${360} step=${1}
        onChange=${(v: number) => onVizParam('fresnelHue', v)} />
      <${Slider} label="Metalness" value=${vizParams['metalness'] ?? 10} min=${0} max=${100} step=${1}
        onChange=${(v: number) => onVizParam('metalness', v)} />
      <${Slider} label="Roughness" value=${vizParams['roughness'] ?? 5} min=${0} max=${100} step=${1}
        onChange=${(v: number) => onVizParam('roughness', v)} />
      <${Slider} label="Opacity" value=${vizParams['opacity'] ?? 100} min=${0} max=${100} step=${1}
        onChange=${(v: number) => onVizParam('opacity', v)} />

      <${Section} title="Szene" />
      <${Slider} label="Fog Dichte" value=${vizParams['fogDensity'] ?? 15} min=${0} max=${50} step=${1}
        onChange=${(v: number) => onVizParam('fogDensity', v)} />
      <${Slider} label="Cam Distanz" value=${vizParams['camDistance'] ?? 80} min=${30} max=${200} step=${1}
        onChange=${(v: number) => onVizParam('camDistance', v)} />
      <${Slider} label="Exposure" value=${vizParams['exposure'] ?? 130} min=${50} max=${300} step=${1}
        onChange=${(v: number) => onVizParam('exposure', v)} />
      <${Slider} label="BG Hue" value=${vizParams['bgHue'] ?? 0} min=${0} max=${360} step=${1}
        onChange=${(v: number) => onVizParam('bgHue', v)} />

    </div>
  `
}
