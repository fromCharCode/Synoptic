export interface SpectrumRing {
  draw(frequencyData: Uint8Array | null, energy: number, beatPulse: number, opacity: number): void
  resize(): void
}

export function createSpectrumRing(canvas: HTMLCanvasElement): SpectrumRing {
  const ctx = canvas.getContext('2d')!

  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  function draw(frequencyData: Uint8Array | null, energy: number, beatPulse: number, opacity: number) {
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    if (!frequencyData || opacity <= 0) return

    const cx = w / 2
    const cy = h / 2
    const baseR = Math.min(w, h) * 0.32
    const n = frequencyData.length

    ctx.globalAlpha = opacity

    // Radial spectrum lines
    for (let i = 0; i < n; i++) {
      const val = (frequencyData[i] ?? 0) / 255
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      const r1 = baseR
      const r2 = baseR + val * baseR * 0.4
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      ctx.beginPath()
      ctx.moveTo(cx + cos * r1, cy + sin * r1)
      ctx.lineTo(cx + cos * r2, cy + sin * r2)

      // Color based on frequency position
      const hue = (i / n) * 360
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${0.3 + val * 0.5})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Energy glow ring
    if (energy > 0.01) {
      ctx.beginPath()
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(92, 224, 214, ${energy * 0.3})`
      ctx.lineWidth = 1 + energy * 2
      ctx.stroke()
    }

    // Beat pulse ring
    if (beatPulse > 0.01) {
      const pulseR = baseR + beatPulse * 30
      ctx.beginPath()
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(244, 114, 182, ${beatPulse * 0.6})`
      ctx.lineWidth = 1 + beatPulse * 3
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }

  resize()
  return { draw, resize }
}
