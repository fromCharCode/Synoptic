import * as THREE from 'three'
import type { FXPass, FXParam } from '@core/types'

export interface FXChain {
  addPass(pass: FXPass): void
  removePass(id: string): void
  getPasses(): FXPass[]
  getParams(): FXParam[]
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void
  resize(width: number, height: number): void
  dispose(): void
}

export function createFXChain(renderer: THREE.WebGLRenderer, width: number, height: number): FXChain {
  const passes: FXPass[] = []

  const rtOptions = { format: THREE.RGBAFormat }
  const rtA = new THREE.WebGLRenderTarget(width, height, rtOptions)
  const rtB = new THREE.WebGLRenderTarget(width, height, rtOptions)
  const sceneRT = new THREE.WebGLRenderTarget(width, height, rtOptions)

  let time = 0

  const chain: FXChain = {
    addPass(pass) {
      passes.push(pass)
      passes.sort((a, b) => a.order - b.order)
      pass.init(renderer, width, height)
    },

    removePass(id) {
      const idx = passes.findIndex(p => p.id === id)
      if (idx >= 0) {
        passes[idx]!.dispose()
        passes.splice(idx, 1)
      }
    },

    getPasses() {
      return passes
    },

    getParams() {
      const allParams: FXParam[] = []
      for (const pass of passes) {
        allParams.push(...pass.params)
      }
      return allParams
    },

    render(r, s, cam) {
      time += 0.016

      const active = passes.filter(p => p.enabled && p.isActive())

      if (active.length === 0) {
        r.setRenderTarget(null)
        r.render(s, cam)
        return
      }

      r.setRenderTarget(sceneRT)
      r.render(s, cam)

      let input = sceneRT
      let output: THREE.WebGLRenderTarget | null = rtA

      for (let i = 0; i < active.length; i++) {
        const isLast = i === active.length - 1
        output = isLast ? null : (input === rtA ? rtB : rtA)

        active[i]!.render(r, input, output, { time, dt: 0.016 })

        if (!isLast) {
          input = output!
        }
      }

      r.setRenderTarget(null)
    },

    resize(w, h) {
      rtA.setSize(w, h)
      rtB.setSize(w, h)
      sceneRT.setSize(w, h)
      for (const pass of passes) pass.resize(w, h)
    },

    dispose() {
      rtA.dispose()
      rtB.dispose()
      sceneRT.dispose()
      for (const pass of passes) pass.dispose()
    },
  }

  return chain
}
