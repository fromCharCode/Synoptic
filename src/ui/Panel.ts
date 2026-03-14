import { h } from 'preact'
import type { ComponentChildren } from 'preact'
import htm from 'htm'

const html = htm.bind(h)

export function Panel({ children, tabs, activeTab, onTabChange, open }: {
  children: ComponentChildren; tabs: string[]; activeTab: string
  onTabChange: (tab: string) => void; open: boolean
}) {
  return html`
    <div id="panel" class=${open ? 'open' : ''}>
      <div class="tabs">
        ${tabs.map(t => html`
          <div class="tab ${t === activeTab ? 'active' : ''}"
            onClick=${() => onTabChange(t)}>${t}</div>
        `)}
      </div>
      ${children}
    </div>
  `
}

// Panel toggle button (hamburger)
export function PanelToggle({ onClick }: { onClick: () => void }) {
  return html`
    <div id="pt" onClick=${onClick}>
      <svg viewBox="0 0 24 24">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </div>
  `
}
