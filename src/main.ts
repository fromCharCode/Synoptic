import { createApp } from './app'

const canvas = document.getElementById('gl') as HTMLCanvasElement
if (canvas) {
  const app = createApp(canvas)

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); app.togglePause() }
    if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen()
      else void document.exitFullscreen()
    }
    if (e.key === 'm' || e.key === 'M') {
      if (app.audioEngine.isActive) app.audioEngine.disconnect()
      else void app.audioEngine.connectMic()
    }
  })

  // Intro fade
  setTimeout(() => {
    const intro = document.getElementById('intro')
    if (intro) intro.classList.add('gone')
  }, 2500)
}
