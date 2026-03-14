import { h } from 'preact'
import htm from 'htm'
import { Section, StyleButton } from './controls'

const html = htm.bind(h)

export interface VizTabProps {
  activeVisualizer: string
  visualizers: Array<{ id: string; name: string; category: string; description: string }>
  onSelect: (id: string) => void
}

export function VizTab({ activeVisualizer, visualizers, onSelect }: VizTabProps) {
  return html`
    <div class="tc active">
      <${Section} title="Visualizer" />
      <div class="sg">
        ${visualizers.map(v => html`
          <${StyleButton}
            label=${v.name}
            active=${activeVisualizer === v.id}
            onClick=${() => onSelect(v.id)}
          />
        `)}
      </div>
      ${visualizers.length === 0 ? html`
        <div style="font-size:8px;color:var(--fd);padding:8px;text-align:center;">
          Keine Visualizer registriert
        </div>
      ` : null}
    </div>
  `
}
