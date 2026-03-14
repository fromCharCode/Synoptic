import { describe, it, expect } from 'vitest'
import { kleinBottle, torus, boysSurface, evaluateSurface, TOPOLOGY_INFO } from '../surfaces'

describe('surfaces', () => {
  it('kleinBottle returns valid coordinates', () => {
    const p = kleinBottle(0, 0)
    expect(typeof p.x).toBe('number')
    expect(typeof p.y).toBe('number')
    expect(typeof p.z).toBe('number')
    expect(Number.isFinite(p.x)).toBe(true)
  })

  it('torus returns valid coordinates', () => {
    const p = torus(Math.PI, Math.PI)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
    expect(Number.isFinite(p.z)).toBe(true)
  })

  it('boysSurface returns finite values', () => {
    const p = boysSurface(1.0, 1.0)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
    expect(Number.isFinite(p.z)).toBe(true)
  })

  it('evaluateSurface at topology 0 matches kleinBottle', () => {
    const a = evaluateSurface(1, 1, 0)
    const b = kleinBottle(1, 1)
    expect(a.x).toBeCloseTo(b.x, 5)
    expect(a.y).toBeCloseTo(b.y, 5)
    expect(a.z).toBeCloseTo(b.z, 5)
  })

  it('evaluateSurface morphs between topologies', () => {
    const a = evaluateSurface(1, 1, 0)
    const b = evaluateSurface(1, 1, 100)
    const mid = evaluateSurface(1, 1, 50)
    // mid.x should be between a.x and b.x (approximately midpoint due to smoothstep)
    expect(mid.x).toBeCloseTo((a.x + b.x) / 2, 0)
  })

  it('has 9 topology infos', () => {
    expect(TOPOLOGY_INFO).toHaveLength(9)
  })

  it('all surfaces return finite for various inputs', () => {
    const testPoints = [[0, 0], [1, 1], [Math.PI, Math.PI], [0.5, 3.0]] as const
    for (let topo = 0; topo < 900; topo += 100) {
      for (const [u, v] of testPoints) {
        const p = evaluateSurface(u, v, topo)
        expect(Number.isFinite(p.x), `topo=${topo} u=${u} v=${v} x=${p.x}`).toBe(true)
        expect(Number.isFinite(p.y), `topo=${topo} u=${u} v=${v} y=${p.y}`).toBe(true)
        expect(Number.isFinite(p.z), `topo=${topo} u=${u} v=${v} z=${p.z}`).toBe(true)
      }
    }
  })
})
