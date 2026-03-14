import { createApp } from './app'
import { mountUI } from '@ui/App'

const canvas = document.getElementById('gl') as HTMLCanvasElement
if (canvas) {
  const app = createApp(canvas)

  // Mount UI
  const uiRoot = document.getElementById('ui-root')
  if (uiRoot) {
    mountUI(uiRoot, app.store, app.getAppInterface())
  }

  // Intro fade
  setTimeout(() => {
    const intro = document.getElementById('intro')
    if (intro) intro.classList.add('gone')
  }, 2500)

  // Mouse cursor hide/show
  let cursorTimeout: ReturnType<typeof setTimeout> | undefined

  const showCursor = () => {
    document.body.style.cursor = 'default'
    document.body.classList.add('su')
    clearTimeout(cursorTimeout)
    cursorTimeout = setTimeout(() => {
      document.body.style.cursor = 'none'
      document.body.classList.remove('su')
    }, 3000)
  }

  document.addEventListener('mousemove', showCursor)
  document.addEventListener('mousedown', showCursor)

  // Initial hide after 3s
  cursorTimeout = setTimeout(() => {
    document.body.style.cursor = 'none'
  }, 3000)

  // Expose for debugging
  Object.defineProperty(window, 'synoptik', { value: app, writable: true })
}
