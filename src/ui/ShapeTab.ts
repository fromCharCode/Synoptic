import { h } from 'preact'
import htm from 'htm'
import { TOPOLOGY_INFO } from '@visualizers/surfaces'
import { STYLES } from '@scene/MaterialFactory'
import { Section, Slider, StyleButton, Toggle } from './controls'

const html = htm.bind(h)

export interface ShapeTabProps {
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

export function ShapeTab({ vizParams, vizToggles, style, onVizParam, onVizToggle, onStyle }: ShapeTabProps) {
  const topology = vizParams['topology'] ?? 0
  const topoInfo = getTopologyInfo(topology)
  const topoIndex = Math.floor(topology / 100)

  return html`
    <div class="tc active">
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

      <${Section} title="Geometrie" />
      <${Slider} label="Seg U" value=${vizParams['segU'] ?? 90} min=${20} max=${180}
        onChange=${(v: number) => onVizParam('segU', v)} />
      <${Slider} label="Seg V" value=${vizParams['segV'] ?? 45} min=${12} max=${90}
        onChange=${(v: number) => onVizParam('segV', v)} />
      <${Slider} label="Scale" value=${vizParams['scale'] ?? 70} min=${20} max=${150}
        onChange=${(v: number) => onVizParam('scale', v)} />
      <${Slider} label="Rotation" value=${vizParams['rotation'] ?? 25} min=${0} max=${100}
        onChange=${(v: number) => onVizParam('rotation', v)} />

      <${Section} title="Effekte" />
      <${Toggle} label="Wireframe" checked=${vizToggles['wireframe'] ?? false}
        onChange=${(v: boolean) => onVizToggle('wireframe', v)} />
      <${Toggle} label="Auto-Rotation" checked=${vizToggles['autoRotation'] ?? true}
        onChange=${(v: boolean) => onVizToggle('autoRotation', v)} />
      <${Toggle} label="Pulsation" checked=${vizToggles['pulsation'] ?? true}
        onChange=${(v: boolean) => onVizToggle('pulsation', v)} />
      <${Toggle} label="Partikel" checked=${vizToggles['particles'] ?? false}
        onChange=${(v: boolean) => onVizToggle('particles', v)} />
      <${Toggle} label="Clip Plane" checked=${vizToggles['clipPlane'] ?? false}
        onChange=${(v: boolean) => onVizToggle('clipPlane', v)} />
      <${Toggle} label="Inner Side" checked=${vizToggles['innerSide'] ?? false}
        onChange=${(v: boolean) => onVizToggle('innerSide', v)} />
      <${Toggle} label="Fresnel Glow" checked=${vizToggles['fresnelGlow'] ?? true}
        onChange=${(v: boolean) => onVizToggle('fresnelGlow', v)} />
      <${Toggle} label="Spectrum Ring" checked=${vizToggles['spectrumRing'] ?? true}
        onChange=${(v: boolean) => onVizToggle('spectrumRing', v)} />
    </div>
  `
}
