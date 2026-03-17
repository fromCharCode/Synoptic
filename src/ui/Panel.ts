import { h } from 'preact'
import type { ComponentChildren } from 'preact'
import { useState, useCallback, useEffect, useRef } from 'preact/hooks'
import htm from 'htm'

const html = htm.bind(h)

const MIN_W = 220
const MAX_W = 640
const DEFAULT_W = 340

export function Panel({ children, tabs, activeTab, onTabChange, open }: {
  children: ComponentChildren; tabs: string[]; activeTab: string
  onTabChange: (tab: string) => void; open: boolean
}) {
  const [width, setWidth] = useState(DEFAULT_W)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onHandleDown = useCallback((e: MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    e.preventDefault()
  }, [width])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const newW = Math.max(MIN_W, Math.min(MAX_W, startW.current + (startX.current - e.clientX)))
      setWidth(newW)
      document.documentElement.style.setProperty('--panel-w', newW + 'px')
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return html`
    <div id="panel" class=${open ? 'open' : ''} style="width:${width}px">
      <div id="ph" onMouseDown=${onHandleDown} />
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
